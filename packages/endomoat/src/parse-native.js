import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { NATIVE_PARSER_NAME } from './constants.js'

const { freeze, keys } = Object
const { quote: q } = assert

/** @type {import('@endo/compartment-mapper').ParseFn} */
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
   * @type {import('ses').ThirdPartyStaticModuleInterface['execute']}
   */
  const execute = (moduleEnvironmentRecord, compartment) => {
    if (compartmentDescriptor?.policy?.options?.native !== true) {
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

/** @type {import('@endo/compartment-mapper').ParserImplementation} */
export default {
  parse: parseNative,
  heuristicImports: false,
}
