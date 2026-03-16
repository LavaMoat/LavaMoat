/**
 * Provides {@link withTypeStripping}, a decorator that strips TypeScript type
 * annotations from source code before delegating to an underlying parser.
 *
 * @packageDocumentation
 * @internal
 */

import * as modulemodule from 'node:module'
import { ROOT_COMPARTMENT } from '../constants.js'

/**
 * @import {ParserImplementation} from '@endo/compartment-mapper'
 */

const decoder = new TextDecoder()
const encoder = new TextEncoder()

const stripTypeScriptTypes =
  'stripTypeScriptTypes' in modulemodule
    ? /** @type {(source: string) => string} */ (
        modulemodule.stripTypeScriptTypes
      )
    : () => {
        throw new Error(
          'TypeScript type stripping is not supported in this version of Node.js'
        )
      }

/**
 * Decorates a {@link ParserImplementation} to strip TypeScript type annotations
 * from source code before parsing.
 *
 * @param {ParserImplementation} parserImpl - The parser implementation to
 *   decorate
 * @returns {ParserImplementation} A new parser that strips TS types first
 */
export const withTypeStripping = (parserImpl) => {
  // Note: we'd need to let parsers in node optionally accept strings and
  // that would let us avoid re-encoding the string to bytes.
  /** @type {ParserImplementation['parse']} */
  const parse = (bytes, specifier, location, packageLocation, options) => {
    // Only strip types in the root compartment, which is where the application
    // code lives. This is determined by the compartment descriptor's label, if
    // provided. If no label is provided, we conservatively assume it's not the
    // root compartment and do not strip types.
    if (options?.compartmentDescriptor?.label === ROOT_COMPARTMENT) {
      const source = decoder.decode(bytes)
      const stripped = stripTypeScriptTypes(source)
      bytes = encoder.encode(stripped)
    }

    return parserImpl.parse(
      bytes,
      specifier,
      location,
      packageLocation,
      options
    )
  }

  return {
    parse,
    heuristicImports: parserImpl.heuristicImports,
    synchronous: parserImpl.synchronous,
  }
}
