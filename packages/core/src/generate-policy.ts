/**
 * Provides {@link createModuleInspector} and {@link getDefaultPaths} for
 * LavaMoat policy generation.
 *
 * @packageDocumentation
 */

import EventEmitter from 'node:events'
import path from 'node:path'
import jsonStringify from 'json-stable-stringify'
import { utils, parse, inspectGlobals, inspectImports, inspectSesCompat, inspectEsmImports } from 'lavamoat-tofu'
import { codeSampleFromAstNode } from './code-sample-from-ast-node.js'
import { mergePolicy } from './merge-policy.js'
import { DEFAULT_GLOBAL_THIS_REFS, POLICY_WRITE, MODULE_REFS } from './constants.js'
import type {
  LavamoatModuleRecord,
  LavaMoatPolicy,
  ResourcePolicy,
  Resources,
} from '@lavamoat/types'
import type { File, Program } from '@babel/types'
import type { ParseResult } from '@babel/parser'

const { mergePolicy: mergeGlobalsPolicy, mapToObj, reduceToTopmostApiCallsFromStrings } = utils
const { entries, fromEntries, keys, values, getOwnPropertyNames, prototype: objectPrototype, assign, create } = Object

/** @internal */
type AST = ParseResult<File> | File

/**
 * Function called to determine if a specifier resolves to a built-in module.
 */
export type IsBuiltinFn = (value: string) => boolean

/**
 * Optional fallback to map an unresolved specifier to a package name.
 */
export type ModuleToPackageFallbackFn = (
  requestedName: string
) => string | undefined

/**
 * Options passed when constructing a module inspector or when calling
 * `generatePolicy` / `inspectModule` on it.
 */
export interface ModuleInspectorOptions {
  /** Returns `true` if a specifier resolves to a built-in Node.js module */
  isBuiltin: IsBuiltinFn
  /**
   * If `true`, the root (entry-point) package is trusted and will not appear
   * in the generated policy
   *
   * @defaultValue `true`
   */
  trustRoot?: boolean
  /**
   * Optional fallback to map an unresolved specifier to a package name.
   * Defaults to a heuristic that extracts the npm package name from the specifier.
   */
  moduleToPackageFallback?: ModuleToPackageFallbackFn
}

/**
 * Options for `generatePolicy`.
 */
export interface GeneratePolicyOptions extends Partial<ModuleInspectorOptions> {
  /** Optional policy override to merge into the generated policy */
  policyOverride?: LavaMoatPolicy
}

/**
 * A module inspector and policy generator created by {@link createModuleInspector}.
 *
 * Extends `EventEmitter` so callers can listen for `compat-warning` events.
 */
export interface ModuleInspector extends EventEmitter {
  /**
   * Inspect a module record.
   *
   * @param moduleRecord - The module record to inspect
   * @param opts - Additional options (merged with those passed to `createModuleInspector`)
   */
  inspectModule(
    moduleRecord: LavamoatModuleRecord,
    opts?: Partial<ModuleInspectorOptions>
  ): void
  /**
   * Generate a policy from all modules inspected so far.
   *
   * @param opts - Additional generation options
   * @returns Generated (and optionally override-merged) policy
   */
  generatePolicy(opts?: GeneratePolicyOptions): LavaMoatPolicy
}

/**
 * Creates a module inspector that accumulates per-module analysis and can
 * generate a LavaMoat policy on demand.
 *
 * Usage:
 * 1. Call `inspector.inspectModule(record)` for each module in the graph
 * 2. Call `inspector.generatePolicy()` to get the resulting policy
 *
 * @param opts - Inspector options
 * @returns A `ModuleInspector` with `inspectModule` and `generatePolicy` methods
 *
 * @example
 * ```ts
 * const inspector = createModuleInspector({ isBuiltin: (s) => s.startsWith('node:') })
 * for (const record of moduleRecords) {
 *   inspector.inspectModule(record)
 * }
 * const policy = inspector.generatePolicy()
 * ```
 */
export function createModuleInspector(opts: ModuleInspectorOptions): ModuleInspector {
  const moduleIdToModuleRecord = new Map<string, LavamoatModuleRecord>()
  const packageToModules = new Map<string, Record<string, LavamoatModuleRecord>>()
  const packageToGlobals = new Map<string, Map<string, unknown>>()
  const packageToBuiltinImports = new Map<string, string[]>()
  const packageToNativeModules = new Map<string, LavamoatModuleRecord[]>()
  let root: LavamoatModuleRecord | undefined

  const inspector: ModuleInspector = assign(new EventEmitter(), {
    inspectModule: (
      moduleRecord: LavamoatModuleRecord,
      opts2?: Partial<ModuleInspectorOptions>
    ) => {
      inspectModule(moduleRecord, { ...opts, ...opts2 })
    },
    generatePolicy: (opts2?: GeneratePolicyOptions): LavaMoatPolicy => {
      return generatePolicyFn({ ...opts, ...opts2 })
    },
  })

  return inspector

  function inspectModule(
    moduleRecord: LavamoatModuleRecord,
    { isBuiltin, trustRoot = true }: ModuleInspectorOptions
  ): void {
    if (moduleRecord === undefined) return

    const { packageName, specifier, type } = moduleRecord
    moduleIdToModuleRecord.set(specifier, moduleRecord)

    switch (type) {
      case 'builtin':
        // builtins themselves need no policy entry
        return
      case 'native':
        inspectNativeModule(moduleRecord)
        return
      case 'js':
        inspectJsModule(moduleRecord, { isBuiltin, trustRoot })
        return
      default: {
        const unknownType: string = type
        const errMsg = `LavaMoat - unknown module type "${unknownType}" for package "${packageName}" module "${specifier}"`
        throw new Error(errMsg)
      }
    }
  }

  function inspectNativeModule(moduleRecord: LavamoatModuleRecord): void {
    const { packageName } = moduleRecord
    if (!packageToNativeModules.has(packageName)) {
      packageToNativeModules.set(packageName, [])
    }
    packageToNativeModules.get(packageName)!.push(moduleRecord)
  }

  function inspectJsModule(
    moduleRecord: LavamoatModuleRecord,
    { isBuiltin, trustRoot = true }: { isBuiltin: IsBuiltinFn; trustRoot?: boolean }
  ): void {
    const { packageName, specifier, isRoot } = moduleRecord
    if (isRoot) {
      if (root && root.packageName !== moduleRecord.packageName) {
        throw new TypeError(
          `LavaMoat - multiple root modules detected (${packageName} and ${root.packageName}). If this is intentional and not an error - report an issue and we will downgrade this to a warning.`
        )
      }
      root = moduleRecord
    }
    moduleIdToModuleRecord.set(specifier, moduleRecord)
    if (!packageToModules.has(packageName)) {
      packageToModules.set(packageName, create(null) as Record<string, LavamoatModuleRecord>)
    }
    packageToModules.get(packageName)![specifier] = moduleRecord

    if (trustRoot && isRoot) return

    const filename = moduleRecord.file || 'unknown'
    const fileExtension = path.extname(filename)
    if (fileExtension && !fileExtension.match(/^\.([cm]?js|ts)$/)) {
      return
    }

    let ast: AST
    try {
      ast =
        (moduleRecord.ast) ??
        parse(moduleRecord.content as string, {
          sourceType: 'unambiguous',
          allowReturnOutsideFunction: true,
          errorRecovery: true,
        })
    } catch (err) {
      if (fileExtension === '') {
        throw new Error(
          `LavaMoat - failed to parse extensionless file of unknown format: ${moduleRecord.file}`,
          { cause: err }
        )
      }
      throw err
    }

    inspectForEnvironment(ast, moduleRecord)
    inspectForGlobals(ast, moduleRecord, packageName)
    inspectForImports(ast, moduleRecord, packageName, isBuiltin)
    delete moduleRecord.ast
  }

  function inspectForEnvironment(
    ast: AST,
    moduleRecord: LavamoatModuleRecord
  ): void {
    const { packageName } = moduleRecord
    // @ts-expect-error ParseResult / AST mismatch
    const compatWarnings = inspectSesCompat(ast) as {
      primordialMutations: Array<{ node: { loc: unknown } }>
      strictModeViolations: Array<{ node: { loc: unknown } }>
      dynamicRequires: Array<{ node: { loc: unknown } }>
    }

    const { primordialMutations, strictModeViolations, dynamicRequires } = compatWarnings
    const hasResults =
      primordialMutations.length > 0 ||
      strictModeViolations.length > 0 ||
      dynamicRequires.length > 0
    if (!hasResults) return

    if (inspector.listenerCount('compat-warning') > 0) {
      inspector.emit('compat-warning', { moduleRecord, compatWarnings })
    } else {
      const samples = jsonStringify({
        primordialMutations: primordialMutations.map(({ node }) =>
          // @ts-expect-error SesCompatNode / Node.loc mismatch
          codeSampleFromAstNode(node, moduleRecord)
        ),
        strictModeViolations: strictModeViolations.map(({ node }) =>
          // @ts-expect-error SesCompatNode / Node.loc mismatch
          codeSampleFromAstNode(node, moduleRecord)
        ),
        dynamicRequires: dynamicRequires.map(({ node }) =>
          // @ts-expect-error SesCompatNode / Node.loc mismatch
          codeSampleFromAstNode(node, moduleRecord)
        ),
      })
      const errMsg = `Incompatible code detected in package "${packageName}" file "${moduleRecord.file}". Violations:\n${samples}`
      console.warn(errMsg)
    }
  }

  function inspectForGlobals(
    ast: AST,
    moduleRecord: LavamoatModuleRecord,
    packageName: string
  ): void {
    const sourceType = (ast as { program?: Program }).program?.sourceType ?? 'module'
    const moduleRefs = MODULE_REFS[sourceType] ?? MODULE_REFS.module

    const globalObjPrototypeRefs = getOwnPropertyNames(objectPrototype)
    const foundGlobals = inspectGlobals(ast, {
      ignoredRefs: [...moduleRefs, ...globalObjPrototypeRefs],
      globalRefs: DEFAULT_GLOBAL_THIS_REFS as unknown as string[],
    })
    if (!foundGlobals.size) return

    if (!packageToGlobals.has(packageName)) {
      packageToGlobals.set(packageName, new Map())
    }
    let packageGlobals = packageToGlobals.get(packageName)!

    for (const [p, value] of [...packageGlobals, ...foundGlobals]) {
      const pathParts = (p).split('.')
      if (pathParts.length > 1 && value === POLICY_WRITE) {
        packageGlobals.set(pathParts[0], true)
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    packageGlobals = mergeGlobalsPolicy(packageGlobals as Map<string, any>, foundGlobals)
    packageToGlobals.set(packageName, packageGlobals)
  }

  function inspectForImports(
    ast: AST,
    moduleRecord: LavamoatModuleRecord,
    packageName: string,
    isBuiltin: IsBuiltinFn
  ): void {
    const namesForBuiltins = entries(moduleRecord.importMap)
      .filter(([, resolvedName]) => isBuiltin(resolvedName))
      .map(([requestedName]) => requestedName)
    const esmModuleBuiltins = inspectEsmImports(
      ast,
      namesForBuiltins
    )
    const { cjsImports: cjsModuleBuiltins } = inspectImports(
      ast,
      namesForBuiltins
    )
    if (cjsModuleBuiltins.length + esmModuleBuiltins.length === 0) return

    if (!packageToBuiltinImports.has(packageName)) {
      packageToBuiltinImports.set(packageName, [])
    }
    const existing = packageToBuiltinImports.get(packageName)!
    packageToBuiltinImports.set(packageName, [
      ...new Set([...existing, ...cjsModuleBuiltins, ...esmModuleBuiltins]),
    ])
  }

  function generatePolicyFn({
    policyOverride,
    moduleToPackageFallback,
    trustRoot = true,
  }: GeneratePolicyOptions): LavaMoatPolicy {
    const resources: Resources = {}
    const policy: LavaMoatPolicy = { resources }

    packageToModules.forEach((packageModules, packageName) => {
      let globals: ResourcePolicy['globals']
      let builtin: ResourcePolicy['builtin']
      let packages: ResourcePolicy['packages']

      const isRootModule = root && packageName === root.packageName
      if (isRootModule && trustRoot) return

      const packageDeps = aggregateDeps({
        packageModules,
        moduleIdToModuleRecord,
        moduleToPackageFallback,
      })
      if (packageDeps.length) {
        packages = fromEntries(packageDeps.map((dep) => [dep, true as const]))
      }

      if (packageToGlobals.has(packageName)) {
        const globalMap = mapToObj(packageToGlobals.get(packageName)!) as Record<string, unknown>
        keys(globalMap).forEach((key) => {
          if (globalMap[key] === 'read') globalMap[key] = true
        })
        globals = globalMap as ResourcePolicy['globals']
      }

      const builtinImports = packageToBuiltinImports.get(packageName)
      if (builtinImports?.length) {
        const importBuiltin: Record<string, boolean> = {}
        const topmostApiCalls = reduceToTopmostApiCallsFromStrings(builtinImports)
        topmostApiCalls.forEach((p) => { importBuiltin[p] = true })
        builtin = importBuiltin
      }

      const native = packageToNativeModules.has(packageName) as boolean | undefined

      if (!isRootModule && !packages && !globals && !builtin && !native) return

      const packagePolicy: ResourcePolicy = {}
      if (packages) packagePolicy.packages = packages
      if (globals) packagePolicy.globals = globals
      if (builtin) packagePolicy.builtin = builtin
      if (native) packagePolicy.native = native

      if (root && isRootModule) {
        policy.root = { usePolicy: root.packageName }
      }
      resources[packageName] = packagePolicy
    })

    return mergePolicy(policy, policyOverride)
  }
}

/**
 * @internal
 */
interface AggregateDepsOptions {
  packageModules: Record<string, LavamoatModuleRecord>
  moduleIdToModuleRecord: Map<string, LavamoatModuleRecord>
  moduleToPackageFallback?: ModuleToPackageFallbackFn
}

/**
 * Collects the unique set of dependency package names for a given package's
 * modules.
 *
 * @internal
 */
function aggregateDeps({
  packageModules,
  moduleIdToModuleRecord,
  moduleToPackageFallback = guessPackageName,
}: AggregateDepsOptions): string[] {
  const deps = new Set<string>()
  values(packageModules).forEach((moduleRecord) => {
    entries(moduleRecord.importMap).forEach(([requestedName, specifier]) => {
      if (!specifier) return
      const depRecord = moduleIdToModuleRecord.get(specifier)
      if (depRecord) {
        if (depRecord.type === 'builtin') return
        deps.add(depRecord.packageName)
        return
      }
      const pkgName =
        moduleToPackageFallback?.(requestedName) ?? `<unknown:${requestedName}>`
      deps.add(pkgName)
    })
    deps.delete(moduleRecord.packageName)
  })
  return Array.from(deps)
}

/**
 * Heuristic fallback that extracts the npm package name from an unresolved
 * specifier.
 *
 * @internal
 */
function guessPackageName(requestedName: string): string | undefined {
  if (requestedName.startsWith('/') || requestedName.startsWith('.')) return undefined
  const pathParts = requestedName.split('/')
  const nameSpaced = requestedName.startsWith('@')
  const packagePartCount = nameSpaced ? 2 : 1
  return pathParts.slice(0, packagePartCount).join('/')
}

/**
 * Returns the default file paths for LavaMoat policy files for a given
 * runtime name.
 *
 * @param policyName - Runtime name (e.g. `'node'`, `'browserify'`)
 * @returns Object with `policiesDir`, `policyDir`, `primary`, `override`, and `debug` paths
 *
 * @example
 * ```ts
 * const { primary, override } = getDefaultPaths('node')
 * // primary → 'lavamoat/node/policy.json'
 * ```
 */
export function getDefaultPaths(policyName: string): {
  policiesDir: string
  policyDir: string
  primary: string
  override: string
  debug: string
} {
  const policiesDir = 'lavamoat'
  const policyDir = path.join(policiesDir, policyName)
  return {
    policiesDir,
    policyDir,
    primary: path.join(policyDir, 'policy.json'),
    override: path.join(policyDir, 'policy-override.json'),
    debug: path.join(policyDir, 'policy-debug.json'),
  }
}
