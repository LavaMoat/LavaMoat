const { RUNTIME_KEY } = require('../ENUM.json')
const diag = require('../buildtime/diagnostics.js')
const { assembleRuntime } = require('./assemble.js')
const path = require('node:path')

/** @import {LavaMoatPluginOptions} from '../buildtime/types' */
/** @import {LavaMoatPolicy} from '@lavamoat/types' */

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
       * @param {LavaMoatPolicy} params.policyData - LavaMoat security policy
       *   configuration
       * @param {Object} params.identifiers - Object containing module
       *   identifier mappings
       * @param {string} params.identifiers.root - Root identifier
       * @param {[string, (string | number)[]][]} params.identifiers.identifiersForModuleIds
       *   - Module ID to identifier mappings
       *
       * @param {(string | number)[]} params.identifiers.unenforceableModuleIds
       *   - IDs of modules that cannot be enforced
       *
       * @param {(string | number)[]} [params.identifiers.contextModuleIds] -
       *   Context module IDs
       * @param {Record<string | number, string>} [params.identifiers.externals]
       *   - External module configurations
       *
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
            // the string used to indicate root resource id
            {
              name: 'root',
              data: root,
              json: true,
            },
            // a mapping used to look up resource ids by module id
            {
              name: 'idmap',
              data: identifiersForModuleIds,
              json: true,
            },
            // list of ids of modules to skip in policy enforcement
            {
              name: 'unenforceable',
              data: unenforceableModuleIds,
              json: true,
            },
            // list of known context modules
            {
              name: 'ctxm',
              data: contextModuleIds || null,
              json: true,
            },
            // known chunk ids
            {
              name: 'kch',
              data: chunkIds,
              json: true,
            },
            // a record of module ids that are externals and need to be enforced as builtins
            {
              name: 'externals',
              data: externals || null,
              json: true,
            },
            // options to turn on scuttling
            { name: 'options', data: runtimeOptions, json: true },
            // scuttling module, if needed
            (typeof runtimeOptions?.scuttleGlobalThis === 'boolean' &&
              runtimeOptions.scuttleGlobalThis === true) ||
            (typeof runtimeOptions?.scuttleGlobalThis === 'object' &&
              runtimeOptions.scuttleGlobalThis.enabled === true)
              ? {
                  name: 'scuttling',
                  shimRequire: 'lavamoat-core/src/scuttle.js',
                }
              : {},
            // the policy itself
            { name: 'policy', data: policyData, json: true },
            // enum for keys to match the generated ones in wrapper
            {
              name: 'ENUM',
              file: require.resolve('../ENUM.json'),
              json: true,
            },
            // endowments module
            {
              name: 'endowmentsToolkit',
              shimRequire: 'lavamoat-core/src/endowmentsToolkit.js',
            },
            // main lavamoat runtime
            {
              name: 'runtime',
              file: require.resolve('./runtime.js'),
            },
          ]

          if (options.debugRuntime) {
            // optional debug helpers
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
