import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const { freeze, keys } = Object
const { quote: q } = assert

/**
 * Creates a custom `@endo/compartment-mapper` parser for native Node.js modules
 * (having a `.node` extension)
 *
 * @returns {import('@endo/compartment-mapper').ParserImplementation}
 */
export function createNativeParser() {
  const require = createRequire(new URL('.', import.meta.url))

  /** @type {import('@endo/compartment-mapper').ParseFn} */
  const parseNative = async (
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
      parser: 'native',
      bytes,
      record: freeze({ imports, exports, reexports, execute }),
    }
  }

  return {
    parse: parseNative,
    heuristicImports: false,
  }
}
