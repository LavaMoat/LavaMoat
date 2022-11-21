//@ts-check
const { spawnSync } = require('child_process')
const { mkdtempSync, rmdirSync } = require('fs')
const path = require('path')
const { tmpdir } = require('os')
const promptly = require('promptly')
const setupScripts = require('./lib/setup-scripts')
const installLavamoat = require('./lib/install-lavamoat')

const SUPPORTED_PKG_MANAGERS = ['npm','pnpm','yarn1','yarn3']

const makeTmpDir = () => mkdtempSync(path.join(tmpdir(), 'lavamoat-protect-'))

module.exports = {
  SUPPORTED_PKG_MANAGERS,
  async protectProject({ dryRun, force, interactive, ...argv }){
    try {
      const packageManager = interactive
        ? await promptly.choose(
          `Which package manager are you using? [${SUPPORTED_PKG_MANAGERS.map(p => p === argv.packageManager ? '*'+p : p)}]`,
          SUPPORTED_PKG_MANAGERS, {
            default: argv.packageManager
          })
        : argv.packageManager
      const doSetupScripts = interactive
        ? await promptly.confirm('Would you like to install protection against malicious scripts? [y/n]')
        : argv.setupScripts
      if (doSetupScripts) {
        await setupScripts({packageManager, dryRun, interactive, force})
      }
      // TODO: ask the question in a way that it can protect CI and Node.js programs
      const doInstallLavamoat = interactive
        ? await promptly.confirm('Would you like to install lavamoat-node for runtime protections? [y/n]')
        : argv.installLavamoat
      if(doInstallLavamoat) {
        await installLavamoat(packageManager)
      }
    } catch (error) {
      console.error('Sorry, that didn\'t work out...', error)
    }
  },
  async protectEnv({ dryRun, force, ...argv }) {
    try {
      const pms = new Set(argv.packageManager)
      pms.forEach(pm => {
        switch (pm) {
          case 'npm': {
            const result = spawnSync('npm', ['config', '-g', 'get', 'ignore-scripts'])
              .stdout.toString('utf-8').trim()
            if (result !== 'true') {
              const cmdArgs = ['config', '-g', 'set', 'ignore-scripts', 'true']
              console.info(`@lavamoat/protect env running \`npm ${cmdArgs.join(' ')}\``)
              const { stderr, stdout } = spawnSync('npm', cmdArgs)
              const [err, out] = [stderr, stdout].map(b => b.toString('utf-8').trim())
              if (out) {
                console.warn('@lavamoat/protect env npm-config INFO:', out)
              }
              if (err) {
                console.error('@lavamoat/protect env npm-config ERROR:', err)
              }
            }
            return
          }
          case 'pnpm': {
            throw new Error('TODO')
          }
          case 'yarn1': {
            // yarn has no interface to query global config explicitly
            const cwd = makeTmpDir()
            try {
              const result = spawnSync('yarn', ['config', 'get', 'ignore-scripts'], { cwd })
                .stdout.toString('utf-8').trim()
              if (result !== 'true') {
                const cmdArgs = ['config', 'set', 'ignore-scripts', 'true', '-g']
                console.info(`@lavamoat/protect env running \`yarn ${cmdArgs.join(' ')}\``)
                const { stderr, stdout } = spawnSync('yarn', cmdArgs)
                const [err, out] = [stderr, stdout].map(b => b.toString('utf-8').trim())
                if (!out.match(/success/)) {
                  console.warn('@lavamoat/protect env yarn-config INFO:', out)
                }
                if (err) {
                  console.error('@lavamoat/protect env yarn-config ERROR:', err)
                }
              }
            } finally {
              rmdirSync(cwd)
            }
            return
          }
          case 'yarn3': {
            const cwd = makeTmpDir()
            try {
              const result = spawnSync('yarn', ['config', 'get', 'enableScripts'], { cwd })
                .stdout.toString('utf-8').trim()
              if (result !== 'false') {
                const cmdArgs = ['config', 'set', '-H', 'enableScripts', 'false']
                console.info(`@lavamoat/protect env running \`yarn ${cmdArgs.join(' ')}\``)
                const { stderr, stdout } = spawnSync('yarn', cmdArgs)
                const [err, out] = [stderr, stdout].map(b => b.toString('utf-8').trim())
                if (!out.match(/YN0000/)) {
                  console.warn('@lavamoat/protect env yarn-config INFO:', out)
                }
                if (err) {
                  console.error('@lavamoat/protect env yarn-config ERROR:', err)
                }
              }
            } finally {
              rmdirSync(cwd)
            }
            return
          }
        }
      })

    } catch (error) {
      console.error('Sorry, that didn\'t work out...', error)
    }
  }
}

