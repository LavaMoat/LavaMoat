/**
 * Provides a single analyzer pass factory for policy-generation parsing.
 *
 * The pass captures the AST once and delegates to tofu's analysis primitives in
 * `done()`, returning a combined `{ globals, builtins, violations }` result.
 * Running all three analyses in a single pass avoids multiple Babel traversals
 * and eliminates positional-tuple ordering fragility in `onModuleComplete`.
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
 * @internal
 */
export const createPolicyGenVisitor = (options = {}) => {
  const { builtinModules = [...ALL_BUILTIN_MODULES], ...globalsOptions } =
    options

  /** @type {File | undefined} */
  let capturedAst

  return {
    visitor: {
      /** @param {NodePath<Program>} path */
      Program(path) {
        capturedAst = /** @type {File} */ (path.parent)
      },
    },
    done() {
      /* c8 ignore next 5 */
      if (!capturedAst) {
        throw new ReferenceError(
          `AST traversal did not visit Program Node; this is a bug (somewhere)`
        )
      }

      const globals = /** @type {GlobalsAnalyzerResults} */ (
        inspectGlobals(capturedAst, globalsOptions)
      )

      const esmBuiltins = inspectEsmImports(capturedAst, builtinModules)
      const { cjsImports: cjsBuiltins } = inspectRequires(
        capturedAst,
        builtinModules
      )
      const builtins = /** @type {BuiltinsAnalyzerResults} */ (
        new Set([...esmBuiltins, ...cjsBuiltins])
      )

      const violations = serializeViolations(
        inspectSesCompat(/** @type {any} */ (capturedAst))
      )

      return { globals, builtins, violations }
    },
  }
}
