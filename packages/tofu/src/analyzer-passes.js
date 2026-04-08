'use strict'

/**
 * Provides analyzer pass factories compatible with `@endo/parser-pipeline`.
 *
 * Each factory creates a pass that captures the AST during traversal and
 * delegates to the existing tofu analysis functions in `getResults()`.
 *
 * @module
 */

/** @import {GlobalPolicyValue} from '@lavamoat/types' */
/** @import {Visitor, NodePath} from '@babel/traverse' */
/** @import {File} from '@babel/types' */
/** @import {InspectSesCompatResult} from './inspectSesCompat' */

const {
  inspectGlobals,
  inspectEsmImports,
  inspectRequires,
} = require('./inspectSource')
const { inspectSesCompat } = require('./inspectSesCompat')

/**
 * Creates an analyzer pass that detects global variable usage.
 *
 * Compatible with `@endo/parser-pipeline`'s `AnalyzerPass` interface.
 *
 * @param {object} [options]
 * @param {readonly string[]} [options.ignoredRefs] - Identifiers to skip.
 * @param {readonly string[]} [options.globalRefs] - Known global reference
 *   names (e.g., `globalThis`, `window`).
 * @param {readonly string[]} [options.globalPropertyNames] - Intrinsic property
 *   names to filter out.
 * @param {readonly string[]} [options.languageRefs] - Language-level references
 *   to filter out.
 * @returns {{
 *   visitor: Visitor
 *   getResults: () => Map<string, GlobalPolicyValue>
 * }}
 */
function createGlobalsAnalyzerPass(options = {}) {
  /** @type {File | undefined} */
  let capturedAst
  return {
    visitor: {
      /** @param {NodePath} path */
      Program(path) {
        capturedAst = /** @type {File} */ (path.parent)
      },
    },
    getResults() {
      if (!capturedAst) {
        throw new Error(
          'Globals analyzer: AST was not captured during traversal'
        )
      }
      return inspectGlobals(capturedAst, options)
    },
  }
}

/**
 * Creates an analyzer pass that detects builtin module imports.
 *
 * Inspects both ESM `import` declarations and CJS `require()` calls for
 * references to the specified builtin modules.
 *
 * Compatible with `@endo/parser-pipeline`'s `AnalyzerPass` interface.
 *
 * @param {object} [options]
 * @param {readonly string[]} [options.builtinModules] - List of builtin module
 *   names to detect (e.g., `['fs', 'path', 'node:crypto']`).
 * @returns {{ visitor: Visitor; getResults: () => Set<string> }}
 */
function createBuiltinsAnalyzerPass(options = {}) {
  const { builtinModules = [] } = options
  /** @type {File | undefined} */
  let capturedAst
  return {
    visitor: {
      /** @param {NodePath} path */
      Program(path) {
        capturedAst = /** @type {File} */ (path.parent)
      },
    },
    getResults() {
      if (!capturedAst) {
        throw new Error(
          'Builtins analyzer: AST was not captured during traversal'
        )
      }
      const esmBuiltins = inspectEsmImports(capturedAst, builtinModules)
      const { cjsImports: cjsBuiltins } = inspectRequires(
        capturedAst,
        builtinModules
      )
      return new Set([...esmBuiltins, ...cjsBuiltins])
    },
  }
}

/**
 * Creates an analyzer pass that detects SES compatibility violations.
 *
 * Checks for primordial mutations, strict mode violations, and dynamic
 * `require()` calls.
 *
 * Compatible with `@endo/parser-pipeline`'s `AnalyzerPass` interface.
 *
 * @returns {{
 *   visitor: Visitor
 *   getResults: () => InspectSesCompatResult | null
 * }}
 */
function createViolationsAnalyzerPass() {
  /** @type {File | undefined} */
  let capturedAst
  return {
    visitor: {
      /** @param {NodePath} path */
      Program(path) {
        capturedAst = /** @type {File} */ (path.parent)
      },
    },
    getResults() {
      if (!capturedAst) {
        throw new Error(
          'Violations analyzer: AST was not captured during traversal'
        )
      }
      const { primordialMutations, strictModeViolations, dynamicRequires } =
        inspectSesCompat(/** @type {any} */ (capturedAst))

      const hasViolations = !!(
        primordialMutations.length +
        strictModeViolations.length +
        dynamicRequires.length
      )

      return hasViolations
        ? { primordialMutations, strictModeViolations, dynamicRequires }
        : null
    },
  }
}

module.exports = {
  createGlobalsAnalyzerPass,
  createBuiltinsAnalyzerPass,
  createViolationsAnalyzerPass,
}
