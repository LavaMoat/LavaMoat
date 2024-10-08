import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { NATIVE_PARSER_NAME } from './constants.js'

const { freeze, keys } = Object
const { quote: q } = assert

/**
 * @import {ParseFn, ParserImplementation} from '@endo/compartment-mapper'
 * @import {ThirdPartyStaticModuleInterface} from 'ses'
 * @import {LavaMoatPackagePolicy} from './types.js'
 */

/** @type {ParseFn} */
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
      /** @type {LavaMoatPackagePolicy} */ (compartmentDescriptor?.policy)
        ?.options?.native !== true
    ) {
      throw new Error(
        `Native modules are disallowed in compartment ${q(compartment.name)}`
      )
    }

    const finalExports = require(fileURLToPath(location))
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
