import { LavamoatModuleRecord, parseForPolicy } from 'lavamoat-core'

/**
 * What do we need for testing?
 *
 * - At minimum, we need some files.
 * - A {@link LavamoatPolicy} _or_ an auto-configured policy.
 *     - AOT or JIT for policy generation?
 * - We need an entry point.
 * - Not all files need to be real files; we can use an in-memory filesystem in most cases.
 * - This probably doesn't need to mimic what `lavamoat-core` does
 * - Insofar as terminology, we should _not_ use "scenario" because that's a term of art in `lavamoat-core`. Let's go with "situation" for now.
 *
 */

/**
 *
 * @param {import('./situation.js').Situation} situation
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
async function generatePolicy({ name, entryPoint, volume, policy }) {
  const moduleSpecifier = entryPoint

  if (!moduleSpecifier) {
    throw new TypeError('entryPoint is required')
  }

  /** @type {import('lavamoat-core/src/parseForPolicy.js').ImportHookFn} */
  const importHook = async (specifier) => {
    return new LavamoatModuleRecord({
      specifier,
      file: specifier,
      type: 'js',
      packageName: name,
      content: volume.readFileSync(specifier, 'utf8'),
    })
  }
  const isBuiltin = () => false
  const includeDebugInfo = false

  const config = await parseForPolicy({
    moduleSpecifier,
    resolveHook,
    importHook,
    isBuiltin,
    includeDebugInfo,
  })

  return config
}
