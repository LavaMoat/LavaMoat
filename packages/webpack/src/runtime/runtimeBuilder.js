const { RUNTIME_KEY } = require('../ENUM.json')
const diag = require('../buildtime/diagnostics.js')
const { assembleRuntime } = require('./assemble.js')
const path = require('node:path')

/** @import {LavaMoatPluginOptions} from '../buildtime/types' */

module.exports = {
  /**
   * Builds the LavaMoat runtime configuration and generates runtime source code
   *
   * @param {Object} params - The parameters object
   * @param {LavaMoatPluginOptions} params.options - Runtime configuration
   *   options
   */
  runtimeBuilder({ options }) {
    const runtimeOptions = {
      scuttleGlobalThis: options.scuttleGlobalThis,
      lockdown: options.lockdown,
    }

    return {
      /**
       * Generates the LavaMoat runtime source code based on chunk configuration
       *
       * @param {Object} params - The parameters object
       * @param {string | undefined} params.currentChunkName - The webpack chunk
       *   object
       * @param {(string | number)[]} params.chunkIds - Array of chunk
       *   identifiers
       * @param {Object} params.policyData - LavaMoat security policy
       *   configuration
       * @param {Object} params.identifiers - Object containing module
       *   identifier mappings
       * @param {string} params.identifiers.root - Root identifier
       * @param {Object} params.identifiers.identifiersForModuleIds - Module ID
       *   to identifier mappings
       * @param {any} params.identifiers.unenforceableModuleIds - IDs of modules
       *   that cannot be enforced
       * @param {any} [params.identifiers.contextModuleIds] - Context module IDs
       * @param {Object} [params.identifiers.externals] - External module
       *   configurations
       * @returns {string} The assembled runtime source code
       */
      getLavaMoatRuntimeSource({
        currentChunkName,
        chunkIds,
        policyData,
        identifiers: {
          root,
          identifiersForModuleIds,
          unenforceableModuleIds,
          contextModuleIds,
          externals,
        },
      }) {
        let runtimeChunks = []
        if (
          currentChunkName &&
          options.unlockedChunksUnsafe?.test(currentChunkName)
        ) {
          diag.rawDebug(
            1,
            `adding UNLOCKED runtime for chunk ${currentChunkName}`
          )
          runtimeChunks = [
            {
              name: 'ENUM',
              file: require.resolve('../ENUM.json'),
              json: true,
            },
            {
              name: 'runtime',
              file: require.resolve('./runtimeUnlocked.js'),
            },
          ]
        } else {
          diag.rawDebug(2, `adding runtime for chunk ${currentChunkName}`)

          runtimeChunks = [
            {
              name: 'root',
              data: root,
              json: true,
            },
            {
              name: 'idmap',
              data: identifiersForModuleIds,
              json: true,
            },
            {
              name: 'unenforceable',
              data: unenforceableModuleIds,
              json: true,
            },
            {
              name: 'ctxm',
              data: contextModuleIds || null,
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
              data: externals || null,
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
              file: require.resolve('../ENUM.json'),
              json: true,
            },
            {
              name: 'endowmentsToolkit',
              shimRequire: 'lavamoat-core/src/endowmentsToolkit.js',
            },
            {
              name: 'runtime',
              file: require.resolve('./runtime.js'),
            },
          ]

          if (options.debugRuntime) {
            runtimeChunks.push({
              name: 'debug',
              shimRequire: path.join(__dirname, 'debug.js'),
            })
          }
        }
        const lavaMoatRuntime = assembleRuntime(RUNTIME_KEY, runtimeChunks)
        const size = lavaMoatRuntime.length / 1024
        diag.rawDebug(
          2,
          `Total LavaMoat runtime and policy data size: ${size.toFixed(0)}KB (before minification)`
        )

        return lavaMoatRuntime
      },
    }
  },
}
