import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const { freeze, keys } = Object;

/**
 *
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @returns {import('@endo/compartment-mapper').ParserImplementation}
 */
export function createNativeParser(policy) {
  const require = createRequire(new URL('.', import.meta.url));

  // todo: create a mapping such that execute() can look up the policy

  /** @type {import('@endo/compartment-mapper').ParseFn} */
  const parseNative = async (
    bytes,
    _specifier,
    location,
    _packageLocation,
  ) => {
    /** @type {string[]} */
    const imports = [];
    /** @type {string[]} */
    const reexports = [];
    /** @type {string[]} */
    const exports = [];
    /**
     * @param {Record<string, any>} moduleEnvironmentRecord
     * @param {Compartment} compartment
     * @param {Record<string, string>} resolvedImports
     */
    const execute = (moduleEnvironmentRecord, compartment, resolvedImports) => {
      // TODO enforce policy here

      const finalExports = require(fileURLToPath(location))
      moduleEnvironmentRecord.default = finalExports;
      for (const prop of keys(moduleEnvironmentRecord.default || {})) {
        if (prop !== 'default') {
          moduleEnvironmentRecord[prop] = moduleEnvironmentRecord.default[prop];
        }
      }
    };

    return {
      parser: 'native',
      bytes,
      record: freeze({ imports, exports, reexports, execute }),
    };
  };

  return {
    parse: parseNative,
    heuristicImports: false,
  };
}
