//@ts-check
const promptly = require('promptly')
const setupScripts = require('./lib/setup-scripts')
const installLavamoat = require('./lib/install-lavamoat')

const SUPPORTED_PKG_MANAGERS = ['npm','pnpm','yarn1','yarn3']

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
  async protectEnv({ dryRun, force, interactive, ...argv }) {
    try {
    } catch (error) {
      console.error('Sorry, that didn\'t work out...', error)
    }
  }
}

