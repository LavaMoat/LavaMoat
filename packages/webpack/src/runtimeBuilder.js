// @ts-ignore
const { RUNTIME_KEY } = require('./ENUM.json')
const diag = require('./buildtime/diagnostics.js')
const { assembleRuntime } = require('./buildtime/assemble.js')
const path = require('node:path')

/**
 * @typedef {Object} RuntimeOptions
 * @property {boolean | Object} scuttleGlobalThis - Scuttle global this
 *   configuration
 * @property {boolean} lockdown - Lockdown configuration
 * @property {RegExp} [unlockedChunksUnsafe] - Unlocked chunks pattern
 * @property {boolean} [debugRuntime] - Debug runtime flag
 */

module.exports = {
  /**
   * Builds the LavaMoat runtime configuration and generates runtime source code
   *
   * @param {Object} params - The parameters object
   * @param {RuntimeOptions} params.options - Runtime configuration options
   */
  runtimeBuilder({ options }) {
    const runtimeOptions = {
      scuttleGlobalThis: options.scuttleGlobalThis,
      lockdown: options.lockdown,
    }

    if (
      typeof options.scuttleGlobalThis === 'object' &&
      Array.isArray(runtimeOptions.scuttleGlobalThis.exceptions)
    ) {
      runtimeOptions.scuttleGlobalThis.exceptions =
        runtimeOptions.scuttleGlobalThis.exceptions.map((e) => e.toString())
    }

    return {
      getLavaMoatRuntimeSource({
        chunk,
        chunkIds,
        policyData,
        identifierLookup,
      }) {
        let runtimeChunks = []
        if (chunk.name && options.unlockedChunksUnsafe?.test(chunk.name)) {
          diag.rawDebug(1, `> adding UNLOCKED runtime for chunk ${chunk.name}`)
          runtimeChunks = [
            {
              name: 'ENUM',
              file: require.resolve('./ENUM.json'),
              json: true,
            },
            {
              name: 'runtime',
              file: require.resolve('./runtime/runtimeUnlocked.js'),
            },
          ]
        } else {
          diag.rawDebug(1, `> adding runtime for chunk ${chunk.name}`)

          runtimeChunks = [
            {
              name: 'root',
              data: identifierLookup.root,
              json: true,
            },
            {
              name: 'idmap',
              data: identifierLookup.identifiersForModuleIds,
              json: true,
            },
            {
              name: 'unenforceable',
              data: identifierLookup.unenforceableModuleIds,
              json: true,
            },
            {
              name: 'ctxm',
              data: identifierLookup.contextModuleIds || null,
              json: true,
            },
            {
              // known chunk ids
              name: 'kch',
              data: chunkIds,
              json: true,
            },
            {
              name: 'externals',
              data: identifierLookup.externals || null,
              json: true,
            },
            { name: 'options', data: runtimeOptions, json: true },
            (typeof runtimeOptions?.scuttleGlobalThis === 'boolean' &&
              runtimeOptions.scuttleGlobalThis === true) ||
            (typeof runtimeOptions?.scuttleGlobalThis === 'object' &&
              runtimeOptions.scuttleGlobalThis.enabled === true)
              ? {
                  name: 'scuttling',
                  shimRequire: 'lavamoat-core/src/scuttle.js',
                }
              : {},
            { name: 'policy', data: policyData, json: true },
            {
              name: 'ENUM',
              file: require.resolve('./ENUM.json'),
              json: true,
            },
            {
              name: 'endowmentsToolkit',
              shimRequire: 'lavamoat-core/src/endowmentsToolkit.js',
            },
            {
              name: 'runtime',
              file: require.resolve('./runtime/runtime.js'),
            },
          ]

          if (options.debugRuntime) {
            runtimeChunks.push({
              name: 'debug',
              shimRequire: path.join(__dirname, './runtime/debug.js'),
            })
          }
        }
        const lavaMoatRuntime = assembleRuntime(RUNTIME_KEY, runtimeChunks)

        return lavaMoatRuntime
      },
    }
  },
}
