/**
 * This is a module intended to be run as a Worker thread.
 *
 * It handles the following messages:
 *
 * - `InspectMessage` {see {@link InspectMessage}}: inspects the provided JS source
 *   code for globals and post policy information to the parent thread
 *
 * @packageDocumentation
 */

/**
 * @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue, SesCompat} from '@lavamoat/types'
 * @import {FileUrlString} from '@endo/compartment-mapper'
 * @import {ParseResult} from '@babel/parser'
 * @import {InspectSesCompatResult} from 'lavamoat-tofu
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

export {
  createGlobalPolicy,
  isInspectMessage,
  globalMapToGlobalPolicy as postProcessGlobalMap,
}

const { getOwnPropertyNames } = Object

// Set up the worker thread message handler
if (!isMainThread && parentPort) {
  parentPort.on('message', (message) => {
    // Validate the message type - ignore messages that don't match
    if (isInspectMessage(message)) {
      inspectListener(message)
    }
  })
} else {
  throw new Error('This module is intended to be run as a Worker thread.')
}

const globalObjPrototypeRefs = getOwnPropertyNames(Object.prototype)

/**
 * A module source type
 *
 * @typedef {typeof SOURCE_TYPE_MODULE | typeof SOURCE_TYPE_SCRIPT} SourceType
 */

/**
 * Message type for requesting inspection
 *
 * @typedef {Object} InspectMessage
 * @property {typeof MessageTypes.Inspect} type Message type (discriminant)
 * @property {Uint8Array} source Source bytes
 * @property {SourceType} sourceType Type of source
 * @property {FileUrlString} id Identifier for the source (file:// URL)
 */

/**
 * Message type for responding with global policy
 *
 * @typedef {Object} PoliciesMessage
 * @property {typeof MessageTypes.Policies} type Message type (discriminant)
 * @property {GlobalPolicy | null} globalPolicy The resulting global policy
 * @property {BuiltinPolicy | null} builtinPolicy The resulting builtin policy
 * @property {InspectSesCompatResult | null} [violations] The resulting SES
 *   compatibility violations
 * @property {FileUrlString} id Identifier for the source (file:// URL)
 */

/**
 * Message type for responding with an error
 *
 * @typedef {Object} ErrorMessage
 * @property {typeof MessageTypes.Error} type Message type (discriminant)
 * @property {string} error Error message
 * @property {FileUrlString} id Identifier for the source (file:// URL)
 */

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
 * Performs global inspection on source code.
 *
 * This function:
 *
 * 1. Decodes the bytes into a string using `TextDecoder` (utf-8 encoding).
 * 2. Uses `MODULE_REFS[sourceType]` concatenated with `globalObjPropertyRefs` to
 *    build the `ignoredRefs` option of `inspectGlobals()`.
 * 3. Uses `DEFAULT_GLOBAL_THIS_REFS` as the `globalRefs` option of
 *    `inspectGlobals()`.
 * 4. Calls `inspectGlobals()` with the decoded source code and the options defined
 *    above; `inspectGlobals()` returns a `Map<string, GlobalPolicyValue>`
 * 5. Calls `postProcessGlobalMap()` with the map from step 4 to get a
 *    {@link GlobalPolicy}
 *
 * @param {ParseResult} ast The parsed AST
 * @param {SourceType} sourceType The type of source code
 * @returns {GlobalPolicy | null} The processed global policy
 */
const createGlobalPolicy = (ast, sourceType) => {
  const moduleRefs = MODULE_REFS[sourceType]
  if (!moduleRefs) {
    throw new TypeError(`Unknown sourceType: ${sourceType}`)
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
  const esmModuleBuiltins = inspectEsmImports(ast, builtinModules)
  const { cjsImports: cjsModuleBuiltins } = inspectRequires(ast, builtinModules)
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
 * {@link PoliciesMessage} message to the parent with the processed globals and
 * the original identifier.
 *
 * If an error occurs, it posts an {@link ErrorMessage} to the parent with the
 * error.
 *
 * @param {InspectMessage} message Message to handle
 * @returns {void}
 */
const inspectListener = ({ source, sourceType, id }) => {
  try {
    const ast = parseAst(source)
    const globalPolicy = createGlobalPolicy(ast, sourceType)
    const builtinPolicy = createBuiltinPolicy(ast)
    const violations = inspectViolations(ast)

    // Post message to parent
    if (parentPort) {
      parentPort.postMessage({
        type: MessageTypes.Policies,
        globalPolicy,
        builtinPolicy,
        violations,
        id,
      })
    } else {
      throw new ReferenceError('parentPort is not available')
    }
  } catch (error) {
    if (parentPort) {
      parentPort.postMessage({
        type: MessageTypes.Error,
        error: error instanceof Error ? error.message : String(error),
        id,
      })
    } else {
      throw error
    }
  }
}

/**
 * @param {ParseResult} ast
 * @returns {InspectSesCompatResult | null}
 */
const inspectViolations = (ast) => {
  const compatWarnings = inspectSesCompat(/** @type {any} */ (ast))

  const { primordialMutations, strictModeViolations, dynamicRequires } =
    compatWarnings
  const hasResults =
    primordialMutations.length > 0 ||
    strictModeViolations.length > 0 ||
    dynamicRequires.length > 0
  if (hasResults) {
    return compatWarnings
  }
  return null
}

/**
 * @param {Uint8Array} source
 * @returns {ParseResult}
 */
const parseAst = (source) => {
  const decoder = new TextDecoder('utf-8')
  const sourceCode = decoder.decode(source)

  const ast = parse(sourceCode, {
    sourceType: 'unambiguous',
    // someone must have been doing this
    allowReturnOutsideFunction: true,
    errorRecovery: true,
  })
  return ast
}

// /**
//  * @param {InspectBuiltinsMessage} message
//  */
// const inspectBuiltinsListener = ({ id }) => {
//   try {
//     const builtinPolicy = createBuiltinPolicy(id)
//   }
// }
