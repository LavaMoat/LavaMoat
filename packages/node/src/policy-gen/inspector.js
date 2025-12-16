/**
 * This is a module intended to be run as a Worker thread.
 *
 * It handles the following messages:
 *
 * - `inspect` {see {@link InspectMessage}}: inspects the provided JS source code
 *   for globals, builtins, SES compatibility violations, and posts the results
 *   to the parent thread
 *
 * It sends the following messages to the parent thread:
 *
 * - `policies` {see {@link InspectionResultsMessage}}: posts the results of the
 *   inspection
 * - `error` {see {@link ErrorMessage}}: posts an error to the parent thread
 *
 * This module is intended to be run as a Worker thread.
 *
 * @packageDocumentation
 */

/**
 * @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue} from '@lavamoat/types'
 * @import {ParseResult} from '@babel/parser'
 * @import {InspectMessage, InspectionResultsMessage, ErrorMessage, StructuredViolationsResult} from '../internal.js'
 * @import {SourceType} from '../types.js'
 */

import { parse } from '@babel/parser'
import { DEFAULT_GLOBAL_THIS_REFS, MODULE_REFS } from 'lavamoat-core'
import {
  inspectEsmImports,
  inspectGlobals,
  inspectRequires,
  inspectSesCompat,
} from 'lavamoat-tofu'
import { builtinModules } from 'node:module'
import { isMainThread, parentPort } from 'node:worker_threads'
import {
  MessageTypes,
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
} from '../constants.js'
import { GenerationError, InvalidArgumentsError } from '../error.js'

// Set up the worker thread message handler
if (!isMainThread && parentPort) {
  parentPort.on('message', (message) => {
    // Validate the message type - ignore messages that don't match
    if (isInspectMessage(message)) {
      try {
        inspectListener(message)
      } catch (error) {
        if (parentPort) {
          parentPort.postMessage({
            type: MessageTypes.Error,
            error: error instanceof Error ? error.message : `${error}`,
            id: message.id,
          })
        } else {
          throw error
        }
      }
    }
  })
} else {
  throw new Error('This module is intended to be run as a Worker thread.')
}

const { getOwnPropertyNames } = Object

/**
 * Array of all builtin modules, including both bare names (e.g., 'fs') and
 * node: protocol names (e.g., 'node:fs')
 */
const ALL_BUILTIN_MODULES = builtinModules.flatMap((name) =>
  name.startsWith('node:') ? [name] : [name, `node:${name}`]
)

const globalObjPrototypeRefs = getOwnPropertyNames(Object.prototype)

/**
 * Type guard to check if a message is an {@link InspectMessage}
 *
 * @param {unknown} value The value to check
 * @returns {message is InspectMessage} `true` if the value is an
 *   {@link InspectMessage}
 */
const isInspectMessage = (value) => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === MessageTypes.Inspect &&
    'source' in value &&
    'sourceType' in value &&
    'id' in value &&
    value.source instanceof Uint8Array &&
    (value.sourceType === SOURCE_TYPE_MODULE ||
      value.sourceType === SOURCE_TYPE_SCRIPT) &&
    typeof value.id === 'string' &&
    value.id.startsWith('file://')
  )
}

/**
 * Post-processes the output of {@link inspectGlobals} to produce a
 * {@link GlobalPolicy}.
 *
 * This function:
 *
 * 1. Converts `globalMap` to a `Record<string, GlobalPolicyValue>`
 * 2. Replaces any `GlobalPolicyValue` which is string literal `read` with `true`
 * 3. Handles the current inability for LavaMoat to work with writable nested
 *    properties. Finds any entry in the map in which the key contains a `.`
 *    (which is _not_ the last character) _and_ the value is `write`, then:
 *
 *    - Splits the key on the first `.` (this array must have length >= 2)
 *    - Creates a new entry choosing the head element of the array as the new key and
 *         the value as `true`
 *    - Deletes the original entry
 *
 * @param {Map<string, GlobalPolicyValue>} globalMap Map from
 *   {@link inspectGlobals}
 * @returns {GlobalPolicy | null} The resulting global policy
 * @internal
 */
const globalMapToGlobalPolicy = (globalMap) => {
  if (!globalMap.size) {
    return null
  }
  /** @type {Record<string, GlobalPolicyValue>} */
  const result = {}

  for (const [key, value] of globalMap.entries()) {
    // Replace 'read' with true
    if (value === 'read') {
      result[key] = true
    } else if (value === 'write' && key.includes('.') && !key.endsWith('.')) {
      // Handle 'write' values with dots (not at the end)
      const firstDotIndex = key.indexOf('.')
      if (firstDotIndex > 0) {
        // Ensure there's at least one character before the dot
        const rootKey = key.substring(0, firstDotIndex)
        result[rootKey] = true
        // Don't add the original key to result (it gets "deleted")
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
 * Performs global inspection on a parsed AST.
 *
 * This function:
 *
 * 1. Gets module-specific ignored references from `MODULE_REFS[sourceType]`
 * 2. Builds `ignoredRefs` by combining module refs with `globalObjPrototypeRefs`
 * 3. Calls `inspectGlobals()` with the AST, `ignoredRefs`, and
 *    `DEFAULT_GLOBAL_THIS_REFS` as `globalRefs`
 * 4. Calls `globalMapToGlobalPolicy()` to convert the resulting map to a
 *    {@link GlobalPolicy}
 *
 * @param {ParseResult} ast The parsed AST
 * @param {SourceType} sourceType The type of source code
 * @returns {GlobalPolicy | null} The processed global policy
 */
const createGlobalPolicy = (ast, sourceType) => {
  const moduleRefs = MODULE_REFS[sourceType]
  if (!moduleRefs) {
    throw new InvalidArgumentsError(`Unknown sourceType: ${sourceType}`)
  }
  const ignoredRefs = [...moduleRefs, ...globalObjPrototypeRefs]

  const globalMap = inspectGlobals(ast, {
    ignoredRefs,
    globalRefs: DEFAULT_GLOBAL_THIS_REFS,
  })

  // Step 5: Post-process the map
  return globalMapToGlobalPolicy(globalMap)
}

/**
 * @param {ParseResult} ast
 * @returns {Set<string>} The set of builtin modules imported
 */
const inspectBuiltins = (ast) => {
  const esmModuleBuiltins = inspectEsmImports(ast, ALL_BUILTIN_MODULES)
  const { cjsImports: cjsModuleBuiltins } = inspectRequires(
    ast,
    ALL_BUILTIN_MODULES
  )
  if (cjsModuleBuiltins.length + esmModuleBuiltins.length === 0) {
    return new Set()
  }

  return new Set([...cjsModuleBuiltins, ...esmModuleBuiltins])
  // // add debug info
  // if (includeDebugInfo) {
  //   const moduleDebug = debugInfo[moduleRecord.specifier]
  //   moduleDebug.builtin = [
  //     ...new Set([...esmModuleBuiltins, ...cjsModuleBuiltins]),
  //   ]
  // }
}

/**
 * @param {ParseResult} ast
 * @returns {BuiltinPolicy | null}
 */
const createBuiltinPolicy = (ast) => {
  const builtins = inspectBuiltins(ast)

  if (builtins.size) {
    /** @type {BuiltinPolicy} */
    const result = {}
    for (const mod of builtins) {
      result[mod] = true
    }
    return result
  }
  return null
}

/**
 * Handles a {@link InspectMessage} by performing the steps outlined at the top
 * of this file.
 *
 * This function calls {@link createGlobalPolicy} and posts the result as a
 * {@link InspectionResultsMessage} message to the parent with the processed
 * globals and the original identifier.
 *
 * If an error occurs, it posts an {@link ErrorMessage} to the parent with the
 * error.
 *
 * @param {InspectMessage} message Message to handle
 * @returns {void}
 */
const inspectListener = ({ source, sourceType, id }) => {
  /** @type {ParseResult} */
  let ast
  try {
    ast = parseAst(source, sourceType)
  } catch (error) {
    throw new GenerationError(
      `Failed to parse AST for ${id}: ${error instanceof Error ? error.message : `${error}`}`,
      { cause: error }
    )
  }
  /** @type {GlobalPolicy | null} */
  let globalPolicy

  /** @type {BuiltinPolicy | null} */
  let builtinPolicy

  /** @type {StructuredViolationsResult | null} */
  let violations
  try {
    globalPolicy = createGlobalPolicy(ast, sourceType)
  } catch (error) {
    throw new GenerationError(
      `Failed to create global policy for ${id}: ${error instanceof Error ? error.message : `${error}`}`,
      { cause: error }
    )
  }
  try {
    builtinPolicy = createBuiltinPolicy(ast)
  } catch (error) {
    throw new GenerationError(
      `Failed to create builtin policy for ${id}: ${error instanceof Error ? error.message : `${error}`}`,
      { cause: error }
    )
  }
  try {
    violations = inspectViolations(ast, id)
  } catch (error) {
    throw new GenerationError(
      `Failed to inspect violations for ${id}: ${error instanceof Error ? error.message : `${error}`}`,
      { cause: error }
    )
  }

  // Post message to parent
  if (parentPort) {
    /** @type {InspectionResultsMessage} */
    const inspectionResultsMessage = {
      type: MessageTypes.InspectionResults,
      globalPolicy,
      builtinPolicy,
      violations,
      id,
    }
    try {
      parentPort.postMessage(inspectionResultsMessage)
    } catch (error) {
      error
    }
  } else {
    throw new ReferenceError('parentPort is not available')
  }
}

/**
 * @param {ParseResult} ast
 * @param {string} id - The file path (file:// URL)
 * @returns {StructuredViolationsResult | null}
 */
const inspectViolations = (ast, id) => {
  const compatWarnings = inspectSesCompat(/** @type {any} */ (ast))

  const { primordialMutations, strictModeViolations, dynamicRequires } =
    compatWarnings
  const hasResults =
    primordialMutations.length > 0 ||
    strictModeViolations.length > 0 ||
    dynamicRequires.length > 0

  if (!hasResults) {
    return null
  }

  // Transform primordialMutations: extract from node.loc.start
  const transformedPrimordialMutations = primordialMutations.map(
    (violation) => ({
      path: id,
      line: violation.node.loc?.start.line ?? 0,
      column: violation.node.loc?.start.column ?? 0,
      type: 'primordial mutation',
    })
  )

  // Transform strictModeViolations: extract from loc directly
  const transformedStrictModeViolations = strictModeViolations.map(
    (violation) => ({
      path: id,
      line: violation.loc.line,
      column: violation.loc.column,
      type: 'strict-mode violation',
    })
  )

  // Transform dynamicRequires: extract from node.loc.start
  const transformedDynamicRequires = dynamicRequires.map((violation) => ({
    path: id,
    line: violation.node.loc?.start.line ?? 0,
    column: violation.node.loc?.start.column ?? 0,
    type: 'dynamic requires',
  }))

  return {
    primordialMutations: transformedPrimordialMutations,
    strictModeViolations: transformedStrictModeViolations,
    dynamicRequires: transformedDynamicRequires,
  }
}

/**
 * @param {Uint8Array} source
 * @param {SourceType} sourceType
 * @returns {ParseResult}
 */
const parseAst = (source, sourceType) => {
  const decoder = new TextDecoder('utf-8')
  const sourceCode = decoder.decode(source)

  const ast = parse(sourceCode, {
    sourceType: 'unambiguous',
    // someone must have been doing this
    allowReturnOutsideFunction: sourceType === SOURCE_TYPE_SCRIPT,
    errorRecovery: true,
  })
  return ast
}
