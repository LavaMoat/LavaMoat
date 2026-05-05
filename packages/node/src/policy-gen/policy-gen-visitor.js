/**
 * Provides a single analyzer pass factory for policy-generation parsing.
 *
 * The pass captures the AST once and delegates to tofu's analysis primitives in
 * `done()`, returning a combined `{ globals, builtins, violations }` result.
 *
 * @module
 */

import {
  inspectGlobals,
  inspectEsmImports,
  inspectRequires,
} from 'lavamoat-tofu/src/inspectSource.js'
import { inspectSesCompat } from 'lavamoat-tofu/src/inspectSesCompat.js'
import { ALL_BUILTIN_MODULES } from '../constants.js'

/**
 * @import {NodePath} from '@babel/traverse'
 * @import {
 *   File,
 *   Program
 * } from '@babel/types'
 * @import {VisitorPass} from '@endo/parser-pipeline'
 * @import {
 *   BuiltinsAnalyzerResults,
 *   GlobalsAnalyzerResults,
 *   PolicyGenAnalysisResults,
 *   ViolationsAnalyzerResults
 * } from '../internal.js'
 */

/**
 * Serializes the raw `inspectSesCompat` result into a structured-clone-safe
 * snapshot (plain numeric location data, no Babel path / AST node objects).
 *
 * @param {ReturnType<typeof inspectSesCompat>} raw
 * @returns {ViolationsAnalyzerResults}
 */
const serializeViolations = ({
  primordialMutations,
  strictModeViolations,
  dynamicRequires,
}) => {
  const hasViolations = !!(
    primordialMutations.length +
    strictModeViolations.length +
    dynamicRequires.length
  )

  if (!hasViolations) return null

  return {
    primordialMutations: primordialMutations.map((v) => ({
      line: v.node.loc?.start.line ?? 0,
      column: v.node.loc?.start.column ?? 0,
    })),
    strictModeViolations: strictModeViolations.map((v) => ({
      line: v.loc.line,
      column: v.loc.column,
    })),
    dynamicRequires: dynamicRequires.map((v) => ({
      line: v.node.loc?.start.line ?? 0,
      column: v.node.loc?.start.column ?? 0,
    })),
  }
}

/**
 * Options for {@link createPolicyGenVisitor}.
 *
 * @typedef {object} PolicyGenAnalyzerPassOptions
 * @property {readonly string[]} [ignoredRefs] - Identifiers to skip during
 *   globals inspection.
 * @property {readonly string[]} [globalRefs] - Known global reference names
 *   (e.g., `globalThis`, `window`).
 * @property {readonly string[]} [globalPropertyNames] - Intrinsic property
 *   names to filter out during globals inspection.
 * @property {readonly string[]} [languageRefs] - Language-level references to
 *   filter out during globals inspection.
 * @property {readonly string[]} [builtinModules] - List of builtin module names
 *   to detect (e.g., `['fs', 'path', 'node:crypto']`).
 */

/**
 * Creates a single analyzer pass that captures the AST once and performs all
 * policy-generation analyses — globals, builtin imports, and SES compatibility
 * violations — in a single Babel traversal.
 *
 * The `done()` method returns a structured `{ globals, builtins, violations }`
 * object suitable for direct destructuring in `onModuleComplete`.
 *
 * @param {PolicyGenAnalyzerPassOptions} [options]
 * @returns {VisitorPass<PolicyGenAnalysisResults>}
 */
export const createPolicyGenVisitor = (options = {}) => {
  const { builtinModules = [...ALL_BUILTIN_MODULES], ...globalsOptions } =
    options

  /** @type {GlobalsAnalyzerResults | undefined} */
  let globals
  /** @type {BuiltinsAnalyzerResults | undefined} */
  let builtins
  /** @type {ViolationsAnalyzerResults | undefined} */
  let violations

  return {
    visitor: {
      /** @param {NodePath<Program>} path */
      Program({ parent: ast }) {
        globals = /** @type {GlobalsAnalyzerResults} */ (
          inspectGlobals(/** @type {File} */ (ast), globalsOptions)
        )

        const esmBuiltins = inspectEsmImports(ast, builtinModules)
        const { cjsImports: cjsBuiltins } = inspectRequires(ast, builtinModules)
        builtins = /** @type {BuiltinsAnalyzerResults} */ (
          new Set([...esmBuiltins, ...cjsBuiltins])
        )

        violations = serializeViolations(
          inspectSesCompat(/** @type {any} */ (ast))
        )

        // @ts-expect-error - we're not using the ast anymore
        ast = null
      },
    },
    done() {
      if (!globals || !builtins || violations === undefined) {
        throw new ReferenceError(
          `AST traversal failed; this is a bug (somewhere)`
        )
      }
      return { globals, builtins, violations }
    },
  }
}
