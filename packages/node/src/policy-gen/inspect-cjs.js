/**
 * Synchronous module inspection for CJS sources.
 *
 * This is a stop-gap until CJS sources go through the composed parser
 * pipeline (when the CJS lexer is replaced with Babel AST parsing). It
 * performs the same tofu analysis that the composed parser's analyzer passes
 * do for ESM, but via a separate Babel parse.
 *
 * @packageDocumentation
 * @internal
 */

/** @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue} from '@lavamoat/types' */
/** @import {ModuleInspectionResult, StructuredViolationsResult} from '../internal.js' */
/** @import {SourceType, FileUrlString} from '../types.js' */

import { parse } from '@babel/parser'
import { DEFAULT_GLOBAL_THIS_REFS, MODULE_REFS } from 'lavamoat-core'
import {
  inspectEsmImports,
  inspectGlobals,
  inspectRequires,
  inspectSesCompat,
  utils as tofuUtils,
} from 'lavamoat-tofu'
import {
  ALL_BUILTIN_MODULES,
  LAVAMOAT_POLICY_ITEM_READ,
  SOURCE_TYPE_SCRIPT,
} from '../constants.js'
import { GenerationError } from '../error.js'

const { getOwnPropertyNames, freeze, create } = Object
const globalObjPrototypeRefs = getOwnPropertyNames(Object.prototype)
const builtinModules = freeze([...ALL_BUILTIN_MODULES])
const decoder = new TextDecoder('utf-8')

/**
 * Parses source bytes into a Babel AST.
 *
 * @param {Uint8Array} source
 * @param {SourceType} sourceType
 */
const parseAst = (source, sourceType) => {
  const sourceCode = decoder.decode(source)
  return parse(sourceCode, {
    sourceType,
    allowReturnOutsideFunction: sourceType === SOURCE_TYPE_SCRIPT,
    errorRecovery: true,
  })
}

/**
 * @param {Map<string, GlobalPolicyValue>} globalMap
 * @returns {GlobalPolicy | null}
 */
const globalMapToGlobalPolicy = (globalMap) => {
  if (!globalMap.size) {
    return null
  }
  /** @type {Record<string, GlobalPolicyValue>} */
  const result = {}
  for (const [key, value] of globalMap.entries()) {
    if (value === LAVAMOAT_POLICY_ITEM_READ) {
      result[key] = true
    } else if (value === 'write' && key.includes('.') && !key.endsWith('.')) {
      const firstDotIndex = key.indexOf('.')
      if (firstDotIndex > 0) {
        result[key.substring(0, firstDotIndex)] = true
      } else {
        result[key] = value
      }
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * Synchronously inspects a CJS module source for globals, builtins, and SES
 * compatibility violations.
 *
 * Returns a {@link ModuleInspectionResult} matching the shape produced by the
 * composed parser's `onModuleComplete` callback for ESM modules.
 *
 * @param {Uint8Array} source Raw module source bytes.
 * @param {SourceType} sourceType `'module'` or `'script'`.
 * @param {FileUrlString} id Module file URL (for error messages and violation
 *   locations).
 * @returns {ModuleInspectionResult}
 */
export const inspectModuleSync = (source, sourceType, id) => {
  const ast = parseAst(source, sourceType)

  // Globals
  const moduleRefs = MODULE_REFS[sourceType] || []
  const ignoredRefs = [...moduleRefs, ...globalObjPrototypeRefs]
  const globalMap = inspectGlobals(ast, {
    ignoredRefs,
    globalRefs: DEFAULT_GLOBAL_THIS_REFS,
  })
  const globalPolicy = globalMapToGlobalPolicy(globalMap)

  // Builtins
  const esmBuiltins = inspectEsmImports(ast, builtinModules)
  const { cjsImports: cjsBuiltins } = inspectRequires(ast, builtinModules)
  const allBuiltins = [...esmBuiltins, ...cjsBuiltins]
  /** @type {BuiltinPolicy | null} */
  let builtinPolicy = null
  if (allBuiltins.length) {
    const distilled = new Set(
      tofuUtils.reduceToTopmostApiCallsFromStrings(allBuiltins)
    )
    if (distilled.size) {
      builtinPolicy = create(null)
      for (const mod of distilled) {
        builtinPolicy[mod] = true
      }
    }
  }

  // Violations
  const { primordialMutations, strictModeViolations, dynamicRequires } =
    inspectSesCompat(/** @type {any} */ (ast))
  const hasViolations = !!(
    primordialMutations.length +
    strictModeViolations.length +
    dynamicRequires.length
  )
  /** @type {StructuredViolationsResult | null} */
  const violations = hasViolations
    ? {
        primordialMutations: primordialMutations.map((v) => ({
          path: id,
          line: v.node.loc?.start.line ?? 0,
          column: v.node.loc?.start.column ?? 0,
          type: 'primordial mutation',
        })),
        strictModeViolations: strictModeViolations.map((v) => ({
          path: id,
          line: v.loc.line,
          column: v.loc.column,
          type: 'strict-mode violation',
        })),
        dynamicRequires: dynamicRequires.map((v) => ({
          path: id,
          line: v.node.loc?.start.line ?? 0,
          column: v.node.loc?.start.column ?? 0,
          type: 'dynamic requires',
        })),
      }
    : null

  return { globalPolicy, builtinPolicy, violations }
}
