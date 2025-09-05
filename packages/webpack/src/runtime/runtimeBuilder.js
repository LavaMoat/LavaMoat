const { RUNTIME_KEY } = require('../ENUM.json')
const diag = require('../buildtime/diagnostics.js')
const { assembleRuntime, prepareSource } = require('./assemble.js')
const path = require('node:path')

const { RuntimeModule } = require('webpack')

class VirtualRuntimeModule extends RuntimeModule {
  /**
   * @param {Object} options - The options for the VirtualRuntimeModule.
   * @param {string} options.name - The name of the module.
   * @param {string} options.source - The source code of the module.
   * @param {number} [options.stage] - The stage of runtime. One of
   *   RuntimeModule.STAGE_*.
   * @param {boolean} [options.withoutClosure] - Make the source code run
   *   outside the closure for a runtime module
   */
  constructor({
    name,
    source,
    stage = RuntimeModule.STAGE_NORMAL,
    withoutClosure = false,
  }) {
    super(name, stage)
    this.withoutClosure = withoutClosure
    this.virtualSource = `;${source};`
  }
  shouldIsolate() {
    return !this.withoutClosure
  }

  generate() {
    return this.virtualSource
  }
}

/** @import {LavaMoatPluginOptions, LavaMoatChunkRuntimeConfiguration} from '../buildtime/types' */
/** @import {LavaMoatPolicy} from 'lavamoat-core' */
/** @import {RuntimeFragment} from './assemble.js' */
/** @import {Chunk} from 'webpack' */

/**
 * @typedef {Object} LavaMoatRuntimeIdentifiers
 * @property {string} root - Root identifier
 * @property {[string, (string | number)[]][]} identifiersForModuleIds - Module
 *   ID to identifier mappings
 * @property {(string | number)[]} unenforceableModuleIds - IDs of modules that
 *   cannot be enforced
 * @property {(string | number)[]} [contextModuleIds] - Context module IDs
 * @property {Record<string | number, string>} [externals] - External module
 *   configurations
 */

module.exports = {
  /**
   * Builds the LavaMoat runtime configuration and generates runtime source code
   *
   * @param {Object} params - The parameters object
   * @param {LavaMoatPluginOptions} params.options - Runtime configuration
   *   options
   */
  runtimeBuilder({ options }) {
    /**
     * Generates the preamble that caches selected globals to protect runtime
     * from scuttling. The set of cached globals is limited to ones known to be
     * used by runtime modules for the sake of bundle size.
     *
     * @returns {string}
     */
    function getDefensiveCodingPreamble() {
      const globals = [
        'location', // AutoPublicPathRuntimeModule.js
        'setTimeout', // LoadScriptRuntimeModule.js
        'clearTimeout', // LoadScriptRuntimeModule.js
        'document', // LoadScriptRuntimeModule.js, AutoPublicPathRuntimeModule.js
        'trustedTypes', // GetTrustedTypesPolicyRuntimeModule.js
        'self',
      ]
      return `var ${globals.map((g) => `${g} = globalThis.${g}`).join(',')};
const LOCKDOWN_SHIMS = [];`
    }

    /**
     * Prepares the static shims to be included in the runtime chunk.
     *
     * @param {string[]} dependencies - The module specifiers to prepare.
     * @returns {string} The prepared runtime dependencies source.
     */
    function getStaticShims(dependencies) {
      /**
       * Wraps static shim source code to capture the lockdown shim it sets (if
       * any) Makes LOCKDOWN_SHIMS unreachable in its scope and freezes so no
       * other runtime modules can add any new shims to it.
       *
       * @param {string} source - The source code to wrap.
       * @returns {string} The wrapped source code.
       */
      const shimWrap = (source) => `
          LOCKDOWN_SHIMS.push((LOCKDOWN_SHIMS)=>{
            ${source}
          ;
          })`

      const shims = dependencies.map((dep) => {
        const source = prepareSource(dep)
        try {
          new Function(source)
        } catch (e) {
          throw new Error(
            `LavaMoatPlugin: Static shim ${dep} is not valid JS`,
            { cause: e }
          )
        }
        return shimWrap(source)
      })

      return `${shims.join('\n')}
        Object.freeze(LOCKDOWN_SHIMS);`
    }

    function getUnlockedRuntime() {
      /** @satisfies {RuntimeFragment[]} */
      const runtimeFragments = /** @type {const} */([
        {
          name: 'ENUM',
          file: require.resolve('../ENUM.json'),
          json: true,
        },
        {
          name: 'runtime',
          file: require.resolve('./runtimeUnlocked.js'),
        },
      ])

      const unlockedRuntime = assembleRuntime(RUNTIME_KEY, runtimeFragments)

      return unlockedRuntime
    }

    /**
     * Generates the LavaMoat runtime source code based on chunk configuration
     *
     * @param {Object} params - The parameters object
     * @param {LavaMoatChunkRuntimeConfiguration['embeddedOptions']} params.embeddedOptions
     *   - The options to embed in the
     *
     * @param {(string | number)[]} params.chunkIds - Array of chunk identifiers
     * @param {LavaMoatPolicy} params.policyData - LavaMoat security policy
     *   configuration
     * @param {LavaMoatRuntimeIdentifiers} params.identifiers - Object
     *   containing module identifier mappings
     * @returns {string} The assembled runtime source code
     */
    function getLavaMoatRuntimeSource({
      embeddedOptions,
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
      let repairs
      if (options.skipRepairs === true) {
        repairs = ''
      } else {
        repairs = require('./repairsBuilder.js').buildRepairs(
          policyData,
          options.skipRepairs
        )
      }

      /** @type {RuntimeFragment[]} */
      const runtimeFragments = [
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
        { name: 'options', data: embeddedOptions, json: true },
        // scuttling module, if needed
        (typeof embeddedOptions?.scuttleGlobalThis === 'boolean' &&
          embeddedOptions.scuttleGlobalThis === true) ||
        (typeof embeddedOptions?.scuttleGlobalThis === 'object' &&
          embeddedOptions.scuttleGlobalThis.enabled === true)
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
        // repairs
        {
          name: 'repairs',
          rawSource: repairs,
        },
        // main lavamoat runtime
        {
          name: 'runtime',
          file: require.resolve('./runtime.js'),
        },
      ]

      if (options.debugRuntime) {
        // optional debug helpers
        runtimeFragments.push({
          name: 'debug',
          shimRequire: path.join(__dirname, 'debug.js'),
        })
      }

      const lavaMoatRuntime = assembleRuntime(RUNTIME_KEY, runtimeFragments)
      const size = lavaMoatRuntime.length / 1024
      diag.rawDebug(
        2,
        `Total LavaMoat runtime and policy data size: ${size.toFixed(0)}KB (before minification)`
      )

      return lavaMoatRuntime
    }

    return {
      /**
       * Generates the LavaMoat runtime source code based on chunk configuration
       *
       * @param {Object} params - The parameters object
       * @param {Chunk} params.currentChunk - The webpack chunk
       * @param {(string | number)[]} params.chunkIds - Array of chunk
       *   identifiers
       * @param {LavaMoatPolicy} params.policyData - LavaMoat security policy
       *   configuration
       * @param {LavaMoatRuntimeIdentifiers} params.identifiers - Object
       *   containing module identifier mappings
       * @returns {VirtualRuntimeModule[]} The assembled runtime source code
       */
      getLavaMoatRuntimeModules({
        currentChunk,
        chunkIds,
        policyData,
        identifiers,
      }) {
        const currentChunkName = currentChunk.name

        const lavamoatRuntimeModules = [
          new VirtualRuntimeModule({
            name: 'LavaMoat/defensive',
            source: getDefensiveCodingPreamble(),
            stage: RuntimeModule.STAGE_NORMAL, // before all other runtime modules
            withoutClosure: true, // run in the scope of the runtime closure
          }),
        ]

        /** @type {LavaMoatChunkRuntimeConfiguration} */
        let runtimeConfiguration = {
          mode: 'safe',
          staticShims: options.staticShims_experimental,
          embeddedOptions: {
            scuttleGlobalThis: options.scuttleGlobalThis,
            lockdown: options.lockdown,
          },
        }

        // plugin options decide the mode
        if (
          options.unlockedChunksUnsafe &&
          currentChunkName &&
          options.unlockedChunksUnsafe.test(currentChunkName)
        ) {
          runtimeConfiguration = {
            mode: 'unlocked_unsafe',
          }
        }
        if (options.runtimeConfigurationPerChunk_experimental) {
          const chunkConfig =
            options.runtimeConfigurationPerChunk_experimental(currentChunk)
          if (chunkConfig) {
            runtimeConfiguration = {
              mode: chunkConfig.mode || runtimeConfiguration.mode,
              staticShims:
                chunkConfig.staticShims || runtimeConfiguration.staticShims,
              embeddedOptions: Object.assign(
                {},
                runtimeConfiguration.embeddedOptions,
                chunkConfig.embeddedOptions
              ),
            }
          }
        }

        // flesh out the modules for runtimeConfiguration
        switch (runtimeConfiguration.mode) {
          case 'unlocked_unsafe':
            diag.rawDebug(
              1,
              `adding UNLOCKED runtime for chunk ${currentChunkName}`
            )

            lavamoatRuntimeModules.push(
              new VirtualRuntimeModule({
                name: 'LavaMoat/runtime',
                source: getUnlockedRuntime(),
                stage: RuntimeModule.STAGE_TRIGGER, // after all other stages
              })
            )
            break
          case 'safe':
            diag.rawDebug(2, `adding runtime for chunk ${currentChunkName}`)
            lavamoatRuntimeModules.push(
              new VirtualRuntimeModule({
                name: 'LavaMoat/runtime',
                source: getLavaMoatRuntimeSource({
                  chunkIds,
                  policyData,
                  identifiers,
                  embeddedOptions: runtimeConfiguration.embeddedOptions,
                }),
                stage: RuntimeModule.STAGE_TRIGGER, // after all other stages
              })
            )
            break
        }

        if (
          runtimeConfiguration.staticShims &&
          Array.isArray(runtimeConfiguration.staticShims)
        ) {
          const staticShimsWrapped = getStaticShims(
            runtimeConfiguration.staticShims
          )

          lavamoatRuntimeModules.push(
            new VirtualRuntimeModule({
              name: 'LavaMoat/staticShims',
              source: staticShimsWrapped,
              stage: RuntimeModule.STAGE_BASIC, // after Normal
            })
          )
        }

        return lavamoatRuntimeModules
      },
    }
  },
}
