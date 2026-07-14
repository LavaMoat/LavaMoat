/**
 * Yarn 4 plugin for script environment hardening.
 *
 * @module
 */

/** @typedef {NonNullable<import('@yarnpkg/core').Hooks['wrapScriptExecution']>} WrapScriptExecutionHook */

/* global makeRunScriptWrapper */

/**
 * Yarn 4 plugin factory for wrapScriptExecution hook.
 *
 * @param {any} require - Yarn's require function
 * @returns {{ hooks: { wrapScriptExecution: Function } }}
 */
module.exports = {
  name: '@yarnpkg/plugin-runner',
  factory: function (/** @type {NodeJS.Require} */ require) {
    return {
      hooks: {
        /** @type {WrapScriptExecutionHook} */
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
              scriptPayload: extra.script,
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
 * @param {NodeJS.ProcessEnv} _env
 */
function addMandatoryReads(configOptions, _env) {
  if (!configOptions['--permission']) {
    return
  }
  if (!Array.isArray(configOptions['--allow-fs-read'])) {
    configOptions['--allow-fs-read'] = []
  }
  if (!Array.isArray(configOptions['--allow-fs-write'])) {
    configOptions['--allow-fs-write'] = []
  }

  // figure out the /tmp dir for the current platform
  const tmpdir = process.platform === 'win32' ? process.env.TEMP : '/tmp'
  // yarn script execution makes heavy use of temporary dirs
  configOptions['--allow-fs-read'].push(tmpdir)
  configOptions['--allow-fs-write'].push(tmpdir)
}
