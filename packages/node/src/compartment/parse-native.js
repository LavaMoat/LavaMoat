/**
 * Provides {@link parseNative} for execution of (compiled) Node.js modules.
 *
 * Any package wanting to load a native module must have a policy flag
 * explicitly allowing the behavior.
 *
 * @packageDocumentation
 */

import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { NATIVE_PARSER_NAME } from '../constants.js'
import { PermissionDeniedError } from '../error.js'
import { hrLabel } from '../format.js'

const { freeze, keys } = Object

/**
 * @import {ParseFn, ParserImplementation} from '@endo/compartment-mapper'
 * @import {ThirdPartyStaticModuleInterface} from 'ses'
 * @import {LavaMoatEndoPackagePolicy} from '../types.js'
 */

/**
 * A "parser" for a native Node.js module (a.k.a. "Node.js addon")
 *
 * @type {ParseFn}
 */
const parseNative = (
  bytes,
  _specifier,
  location,
  _packageLocation,
  { compartmentDescriptor } = {}
) => {
  /** @type {string[]} */
  const imports = []
  /** @type {string[]} */
  const reexports = []
  /** @type {string[]} */
  const exports = ['default']
  const require = createRequire(new URL('.', import.meta.url))

  /**
   * Enforces policy; the package policy must have `options.native` set to
   * `true`
   *
   * @type {ThirdPartyStaticModuleInterface['execute']}
   */
  const execute = (moduleEnvironmentRecord, compartment) => {
    if (
      /** @type {LavaMoatEndoPackagePolicy} */ (compartmentDescriptor?.policy)
        ?.options?.native !== true
    ) {
      // TODO: we may be guaranteed a compartmentDescriptor. find out!
      throw new PermissionDeniedError(
        `Native modules are disallowed in package ${hrLabel(compartmentDescriptor?.label ?? compartment.name)}`
      )
    }

    const finalExports = require(fileURLToPath(location))

    // copies the contents of `default` into the root of the module environment record
    moduleEnvironmentRecord.default = finalExports
    for (const prop of keys(moduleEnvironmentRecord.default || {})) {
      if (prop !== 'default') {
        moduleEnvironmentRecord[prop] = moduleEnvironmentRecord.default[prop]
      }
    }
  }

  return {
    parser: NATIVE_PARSER_NAME,
    bytes,
    record: freeze({ imports, exports, reexports, execute }),
  }
}

/**
 * Parser for native Node.js modules
 *
 * @type {ParserImplementation}
 * @internal
 */
export default {
  parse: parseNative,
  heuristicImports: false,
  synchronous: true,
}
