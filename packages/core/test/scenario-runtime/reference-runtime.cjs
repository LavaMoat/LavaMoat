// @ts-check
/**
 * Test-only reference runtime for scenario fixtures.
 *
 * Enforces a LavaMoat policy using `endowmentsToolkit`, `scuttle` —
 * no `generateKernel` involved. Run inside a Worker so that `globalThis`
 * scuttling has real effect.
 *
 * @packageDocumentation
 */
/* global Compartment */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { isBuiltin, createRequire } = require('node:module')
// @lavamoat/core is ESM-only; use createRequire to load from the dist CJS shim
// or import() from a sync entry. We use a synchronous dynamic require trick:
// since we are running inside a Worker thread already, we can use the
// CJS interop path via the package exports.
const {
  endowmentsToolkit,
  defaultCreateFunctionWrapper,
} = require('../../dist/endowments-toolkit.js')
const { scuttle } = require('../../dist/scuttle.js')
const { packageNameForPath } = require('./package-name-for-path.cjs')

/**
 * Minimal inline source transforms to satisfy SES requirements.
 *
 * Replicates the behaviour of `lavamoat-core`'s `applySourceTransforms`:
 * 1. Evade HTML comment detection: `<!--` → `< ! --`, `-->` → `-- >`
 * 2. Evade dynamic-import detection: `import(` → `__import__(`
 * 3. Convert direct-eval: `eval(` → `(0,eval)(`
 *
 * @param {string} source
 * @returns {string}
 */
function applySourceTransforms(source) {
  // 1. Evade HTML comments
  source = source.replace(/<!--/g, '< ! --').replace(/-->/g, '-- >')
  // 2. Evade import expressions
  source = source.replace(/(^|[^.]|\.\.\.)\bimport(\s*(?:\(|\/[/*]))/g, '$1__import__$2')
  // 3. Direct eval
  source = source.replace(/\beval(\s*\()/g, '(0,eval)$1')
  return source
}

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {LavaMoatScuttleOpts} from '../../src/scuttle.js'
 */

/**
 * Create a compartment-based CJS runtime and run the entry module.
 *
 * **Must** be called after `lockdown()`.
 *
 * @param {object} opts
 * @param {string} opts.entryPath Absolute path to entry.js
 * @param {LavaMoatPolicy} opts.policy Merged LavaMoat policy
 * @param {Record<string, unknown>} [opts.extraBuiltins] Fake builtins from
 *   setup.js
 * @param {LavaMoatScuttleOpts} [opts.scuttleGlobalThis]
 * @param {string[]} [opts.globalThisRefs] Custom globalThis aliases
 */
const run = ({
  entryPath,
  policy,
  extraBuiltins = {},
  scuttleGlobalThis = { enabled: false },
  globalThisRefs = ['globalThis', 'global'],
}) => {
  const resources = policy.resources ?? {}

  const knownWritableFields = new Set()
  for (const resource of Object.values(resources)) {
    const globals = /** @type {any} */ (resource).globals
    if (globals && typeof globals === 'object') {
      for (const [k, v] of Object.entries(globals)) {
        if (v === 'write') knownWritableFields.add(k)
      }
    }
  }

  const {
    getEndowmentsForConfig,
    copyWrappedGlobals,
    getBuiltinForConfig: _getBuiltinForConfig,
  } = endowmentsToolkit({
    handleGlobalWrite: knownWritableFields.size > 0,
    knownWritableFields,
  })

  const realGlobalThis = globalThis

  // explicitly allow Math and Date
  const rootC = new Compartment({ Math, Date })
  copyWrappedGlobals(realGlobalThis, rootC.globalThis, globalThisRefs)

  // Ensure all requested globalThis aliases resolve to the root compartment's own globalThis
  for (const ref of globalThisRefs) {
    if (!(ref in rootC.globalThis)) {
      try {
        Object.defineProperty(rootC.globalThis, ref, {
          value: rootC.globalThis,
          configurable: true,
          writable: true,
        })
      } catch {
        // already set or non-configurable
      }
    }
  }

  // Scuttle the REAL globalThis (after setting up rootC so it has a good copy)
  scuttle(realGlobalThis, scuttleGlobalThis)

  /** @type {Map<string, typeof Compartment.prototype>} */
  const compartmentCache = new Map([['$root$', rootC]])

  /**
   * Get or create the compartment for a package, with endowments applied.
   *
   * @param {string} pkgName
   * @returns {typeof rootC}
   */
  const compartmentFor = (pkgName) => {
    if (compartmentCache.has(pkgName))
      return /** @type {Compartment} */ (compartmentCache.get(pkgName))

    const c = new Compartment({ Math, Date })
    const pkgPolicy = resources[pkgName] ?? {}
    const endowments = getEndowmentsForConfig(
      rootC.globalThis,
      pkgPolicy,
      realGlobalThis,
      c.globalThis
    )

    Object.defineProperties(c.globalThis, {
      ...Object.getOwnPropertyDescriptors(endowments),
      // Preserve correct global aliases for all globalThisRefs
      ...Object.fromEntries(
        globalThisRefs.map((ref) => [
          ref,
          {
            value: c.globalThis,
            writable: true,
            configurable: true,
            enumerable: false,
          },
        ])
      ),
    })

    // Replace Function constructor in the compartment so that when a function
    // created by `new Function(body)` is called with `this === undefined`
    // (which happens in strict mode when called without a receiver), it uses
    // the compartment's globalThis instead of undefined.  This mirrors the
    // behaviour of @lavamoat/node's ExecutionCompartment and preserves
    // real-world patterns like Webpack's globalThis detection.
    const OriginalFunctionCtor = c.globalThis.Function
    const compartmentGlobal = c.globalThis
    const NewFunctionCtor = /** @type {FunctionConstructor} */ (
      function (...args) {
        const fn = OriginalFunctionCtor(...args)
        return defaultCreateFunctionWrapper(
          fn,
          (thisValue) => thisValue === undefined,
          compartmentGlobal
        )
      }
    )
    Object.defineProperty(NewFunctionCtor, 'prototype', {
      value: OriginalFunctionCtor.prototype,
    })
    c.globalThis.Function = NewFunctionCtor

    compartmentCache.set(pkgName, c)
    return c
  }

  /** @type {Map<string, { exports: any }>} */
  const moduleCache = new Map()

  /**
   * Load a module by absolute path.
   *
   * @param {string} absPath Resolved absolute path to the module
   * @param {string} pkgName LavaMoat package name for this module
   * @returns {unknown} The module's `exports`
   */
  const loadFile = (absPath, pkgName) => {
    if (moduleCache.has(absPath))
      return /** @type {{ exports: any }} */ (moduleCache.get(absPath)).exports

    const c = compartmentFor(pkgName)

    // Cache before evaluating to handle circular deps
    const moduleObj = c.evaluate('({ exports: {} })')
    moduleCache.set(absPath, moduleObj)

    const rawSrc = fs.readFileSync(absPath, 'utf8')
    const src = applySourceTransforms(rawSrc)

    const initSrc = `(function(exports, require, module, __filename, __dirname){\n${src}\n})\n//# sourceURL=${absPath}`
    const init = c.evaluate(initSrc)

    const requireFn = makeRequire(absPath, pkgName)
    const __filename = absPath
    const __dirname = path.dirname(absPath)
    init.call(
      moduleObj.exports,
      moduleObj.exports,
      requireFn,
      moduleObj,
      __filename,
      __dirname
    )

    return moduleObj.exports
  }

  /**
   * Build a `require` function for a given caller module.
   *
   * @param {string} callerPath Absolute path of the calling module
   * @param {string} callerPkg LavaMoat package name of the calling module
   * @returns {(spec: string) => unknown}
   */
  const makeRequire = (callerPath, callerPkg) => {
    const nativeRequire = createRequire(callerPath)

    /** @param {string | { toString(): string }} rawSpec */
    const requireFn = (rawSpec) => {
      // toString coercion – happens exactly once (policy-evasion test)
      const spec = String(rawSpec)

      if (isBuiltin(spec) || spec in extraBuiltins) {
        let mod
        if (spec in extraBuiltins) {
          mod = extraBuiltins[spec]
        } else {
          mod = nativeRequire(spec)
        }

        const callerPolicy = resources[callerPkg] ?? {}
        const builtinPolicy = /** @type {any} */ (callerPolicy).builtin ?? {}
        // Policy keys are stored as-is (e.g. "node:buffer.Buffer.from" or
        // "fs.existsSync").  Use the raw spec for lookup.
        const canonicalSpec = spec

        // Check if the caller is allowed to use this builtin at all
        const allowed = Object.keys(builtinPolicy).some(
          (k) => k === canonicalSpec || k.startsWith(`${canonicalSpec}.`)
        )
        if (!allowed && callerPkg !== '$root$') {
          throw new Error(
            `LavaMoat - required builtin package not in allowlist: package "${callerPkg}" requested "${spec}"`
          )
        }

        // If the whole module is allowed (e.g. builtin.fs === true), return it
        // as-is; otherwise attenuate to only the sub-paths listed in the policy.
        // This mirrors kernelCoreTemplate.js: getBuiltinForConfig is called only
        // when the top-level key is NOT `true`.
        if (builtinPolicy[canonicalSpec] === true) {
          return mod
        }
        return _getBuiltinForConfig(mod, canonicalSpec, builtinPolicy)
      }

      // ── File module ───────────────────────────────────────────────────────
      let resolvedPath
      try {
        resolvedPath = nativeRequire.resolve(spec)
      } catch {
        throw new Error(
          `LavaMoat - Cannot find module '${spec}' from '${callerPath}'`
        )
      }

      const targetPkg = packageNameForPath(resolvedPath)
      const callerIsRoot = callerPkg === '$root$'
      const samePackage = targetPkg === callerPkg

      if (!callerIsRoot && !samePackage) {
        // Policy check: is targetPkg in callerPkg's packages allowlist?
        const callerPolicy = resources[callerPkg] ?? {}
        const allowed =
          /** @type {any} */ (callerPolicy).packages?.[targetPkg] === true
        if (!allowed) {
          throw new Error(
            `LavaMoat - required package not in allowlist: package "${callerPkg}" requested "${targetPkg}" as "${spec}"`
          )
        }
      }

      return loadFile(resolvedPath, targetPkg)
    }

    requireFn.resolve = nativeRequire.resolve.bind(nativeRequire)
    return requireFn
  }

  loadFile(entryPath, '$root$')
}

module.exports = { run, packageNameForPath }
