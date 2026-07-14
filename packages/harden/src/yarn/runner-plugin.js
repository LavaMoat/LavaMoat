/**
 * Yarn 4 plugin for script environment hardening.
 *
 * @module
 */

/* global makeRunScriptWrapper */

/**
 * Yarn 4 plugin factory for wrapScriptExecution hook.
 *
 * @param {any} require - Yarn's require function
 * @returns {{ hooks: { wrapScriptExecution: Function } }}
 */
module.exports = {
  name: '@yarnpkg/plugin-runner',
  factory: function (require) {
    return {
      hooks: {
        /**
         * @param {() => Promise<number>} executor
         * @param {object} project
         * @param {object} locator
         * @param {string} scriptName
         * @param {{
         *   script: string
         *   args: string[]
         *   cwd: string
         *   env: NodeJS.ProcessEnv
         *   stdin: import('stream').Readable | null
         *   stdout: import('stream').Writable
         *   stderr: import('stream').Writable
         * }} extra
         * @returns {Promise<() => Promise<number>>}
         */
        wrapScriptExecution: async (
          executor,
          project,
          locator,
          scriptName,
          extra
        ) => {
          const path = require('node:path')
          const fs = require('node:fs')
          const workspace = project.tryWorkspaceByLocator(locator)

          process._rawDebug('wrapScriptExecution', {
            scriptName,
            extra,
            pkgj: workspace?.manifest?.raw,
          })

          if (!workspace) {
            // a script is being executed outside of a workspace context, so we can't apply any custom logic
            // This is the case when a postinstal is running.

            // "Do nothing" - return the original executor immediately
            // without running any custom plugin logic or reading manifests.
            // TODO: implement wrapping these scripts with reasonable defaults
            return executor
          }

          const pkgJson = workspace.manifest.raw
          const binFolder =
            extra.env.BERRY_BIN_FOLDER || `node_modules${path.sep}.bin`

          const wrapper = makeRunScriptWrapper(
            {
              scriptName,
              projectRoot: extra.cwd,
              pathBinMatcher: (fragment) => {
                return fragment.endsWith(binFolder)
              },
              customizePermissionsConfig: addMandatoryReads,
              readScriptsConfig: () => {
                return pkgJson.scriptsConfig
              },
            },
            {
              readFileSync: fs.readFileSync,
              pathJoin: path.join,
              pathDelimiter: path.delimiter,
            }
          )

          extra.env = wrapper.processEnv(extra.env)
          return executor
        },
      },
    }
  },
}

/**
 * @param {Record<string, boolean | string | string[]>} configOptions
 * @param {NodeJS.ProcessEnv} env
 */
function addMandatoryReads(configOptions, env) {
  if (!configOptions['--permission']) {
    return
  }
  if (!configOptions['--allow-fs-read']) {
    configOptions['--allow-fs-read'] = []
  }
  if (!configOptions['--allow-fs-write']) {
    configOptions['--allow-fs-write'] = []
  }

  // figure out the /tmp dir for the current platform
  const tmpdir = process.platform === 'win32' ? process.env.TEMP : '/tmp'
  // yarn script execution makes heavy use of temporary dirs
  configOptions['--allow-fs-read'].push(tmpdir)
  configOptions['--allow-fs-write'].push(tmpdir)
}
