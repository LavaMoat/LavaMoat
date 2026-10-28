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
    const { tmpdir } = require('node:os')
    const { scriptUtils, structUtils } = require('@yarnpkg/core')
    const path = require('node:path')
    const fs = require('node:fs')
    return {
      hooks: {
        /**
         * @type {import('@yarnpkg/core').Hooks['afterAllInstalled']}
         */
        afterAllInstalled: async (project, options) => {
          if (options.mode === 'update-lockfile') {
            return
          }

          // Pick a workspace (e.g., the root workspace, or iterate through project.workspaces)
          const workspace = project.topLevelWorkspace

          const accessibleBinaries =
            await scriptUtils.getWorkspaceAccessibleBinaries(workspace)

          /** @type {{ [binName: string]: string }} */
          const mapping = {}
          for (let [
            // eslint-disable-next-line prefer-const
            binName,
            [pkg],
          ] of accessibleBinaries.entries()) {
            if (structUtils.isVirtualLocator(pkg)) {
              pkg = structUtils.devirtualizeLocator(pkg)
            }
            mapping[binName] = `${pkg.name}:${pkg.reference.split(':')[0]}`
          }

          // read lavamoat/bin-snapshot.json and compare with mapping
          const binSnapshotPath = path.resolve('lavamoat/bin-snapshot.json')
          /** @type {{ [binName: string]: string }} */
          let binSnapshot = {}
          if (fs.existsSync(binSnapshotPath)) {
            binSnapshot = JSON.parse(fs.readFileSync(binSnapshotPath, 'utf-8'))
          }

          if (process.env.UPDATE_BIN_SNAPSHOT) {
            const forbiddenBins = ['node', 'node-gyp', 'yarn', 'npm']
            for (const bin of forbiddenBins) {
              if (mapping[bin]) {
                console.error(
                  `[LavaMoat][CAUTION]: This should not be a local bin: ${bin} -> ${mapping[bin]}`
                )
              }
            }
            fs.writeFileSync(
              binSnapshotPath,
              JSON.stringify(mapping, null, 2),
              'utf-8'
            )
          } else {
            let mismatch = false
            for (const [binName, pkg] of Object.entries(mapping)) {
              if (!binSnapshot[binName]) {
                console.error(
                  `Binary missing in snapshot: ${binName} -> ${pkg} - update with: --bin-snapshot`
                )
                mismatch = true
                continue
              }
              if (binSnapshot[binName] !== pkg) {
                console.error(
                  `Binary mismatch: ${binName} -> ${pkg}, expected ${binSnapshot[binName]}`
                )
                mismatch = true
              }
            }
            if (mismatch) {
              process.exit(1)
            }
          }
        },
        /** @type {WrapScriptExecutionHook} */
        wrapScriptExecution: async (
          executor,
          project,
          locator,
          scriptName,
          extra
        ) => {
          const workspace = project.tryWorkspaceByLocator(locator)

          if (!workspace) {
            // a script is being executed outside of a workspace context, so we
            // can't apply any custom logic.
            // This is the case when a postinstal is running.

            // "Do nothing" - return the original executor immediately
            // without running any custom plugin logic or reading manifests.
            // TODO: implement wrapping these scripts with reasonable defaults
            return executor
          }

          const pkgJson = workspace.manifest.raw
          // Abundance of caution. It seems yarn is not adding
          // any node_modules/.bin locations to the PATH by default.
          const binFolder = `node_modules${path.sep}.bin`
          // const berryBin = extra.env.BERRY_BIN_FOLDER

          const wrapper = makeRunScriptWrapper(
            {
              scriptName,
              scriptPayload: extra.script,
              projectRoot: project.cwd,
              pathBinMatcher: (fragment) => {
                // BERRY_BIN_FOLDER is controlled by yarn and yarn prevents abuse of yarn and node commands
                // see: https://github.com/yarnpkg/berry/blob/8f638c0806ec8f3758adb13d93567fc782f9c903/packages/yarnpkg-core/sources/scriptUtils.ts#L131-L136
                // Therefore, we only match the binFolder to prevent artifacts from weird setups.
                return fragment.endsWith(binFolder)
              },
              customizePermissionsConfig: addMandatoryReads,
              readPackageJson: () => pkgJson,
            },
            {
              readFileSync: fs.readFileSync,
              existsSync: fs.existsSync,
              pathJoin: path.join,
              pathDelimiter: path.delimiter,
              tmpdir,
              realpathSync: fs.realpathSync,
              lstatSync: fs.lstatSync,
              readlinkSync: fs.readlinkSync,
            }
          )

          // extra.env is a reference to the mutable object, but a
          // different variable containing that reference is used within
          // execute, so we must amend not replace it.
          const newEnv = wrapper.processEnv(extra.env)
          for (const key of Object.keys(extra.env)) {
            delete extra.env[key]
          }
          Object.assign(extra.env, newEnv)
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
  configOptions['--allow-fs-tmp'] = true // yarn always uses tmp dirs.
}
