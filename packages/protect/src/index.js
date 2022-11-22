//@ts-check
const { spawnSync } = require('child_process')
const { mkdtempSync, readdirSync, rmdirSync, statSync } = require('fs')
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
    const pmCmds = {
      npm: {
        cmd: 'npm',
        checkArgs: ['config', '-g', 'get', 'ignore-scripts'],
        setArgs: ['config', '-g', 'set', 'ignore-scripts', 'true'],
        intendedValue: 'true',
        validateSetOut: out => !out,
      },
      yarn1: {
        cmd: 'yarn',
        checkArgs:  ['config', 'get', 'ignore-scripts'],
        intendedValue: 'true',
        setArgs: ['config', 'set', 'ignore-scripts', 'true', '-g'],
        validateSetOut: out => out.match(/success/)
      },
      yarn3: {
        cmd: 'yarn',
        checkArgs: ['config', 'get', 'enableScripts'],
        // just yarn we need to do this for for now? could do a proper version
        // check if there is need for something proper or wider use
        validateCheckOutVersion: out => ['false', 'true'].includes(out),
        intendedValue: 'false',
        setArgs: ['config', 'set', '-H', 'enableScripts', 'false'],
        validateSetOut: out => out.match(/YN0000/)
      }
    }

    const pms = new Set(argv.packageManager)
    Array.from(pms).map(pm => ({pm, ...pmCmds[pm]})).forEach(({
      cmd, checkArgs, validateCheckOutVersion, setArgs, intendedValue, validateSetOut
    }) => {
      if (!cmd) {
        throw new Error('Unimplented package manager')
      }
      // yarn has no interface to query global config explicitly
      const cwd = makeTmpDir()
      try {
        const result = spawnSync(cmd, checkArgs, { cwd })
          .stdout.toString('utf-8').trim()
        if (result !== intendedValue) {
          if (validateCheckOutVersion && !validateCheckOutVersion(result)) {
            console.log(`"""${result}"""`)
            throw new Error(`Unsupported ${cmd} version`)
          }
          console.info(`@lavamoat/protect env running \`${[cmd, ...setArgs].join(' ')}\``)
          const { stderr, stdout } = spawnSync(cmd, setArgs)
          const [err, out] = [stderr, stdout].map(b => b.toString('utf-8').trim())
          if (!validateSetOut(out)) {
            console.warn(`@lavamoat/protect env ${cmd}-config INFO:`, out)
          }
          if (err) {
            console.error(`@lavamoat/protect env ${cmd}-config ERROR:`, err)
          }
        }
      } finally {
        rmdirSync(cwd)
      }
    })
  },
  async checkEnv(argv) {
    const GLOBAL_ROOT_PACKAGE_ALLOWLIST = new Set([
      'corepack', 'npm', 'pnpm', 'yarn'
    ])
    const pms = new Set(argv.packageManager)
    if (pms.has('npm')) {
      const globalPackages = JSON.parse(
        spawnSync('npm', ['ls', '-g', '--depth=0', '-j', '-l']).stdout.toString('utf-8')
      ).dependencies
      const pkgPaths = Object.values(globalPackages)
        .filter(({name}) => !GLOBAL_ROOT_PACKAGE_ALLOWLIST.has(name))
        .map(p => [p.name, p.path])
      const withRootOwned = pkgPaths.filter(([_, pkgPath]) =>
        readdirSync(pkgPath)
          .concat([''])
          .map(p => path.join(pkgPath, p))
          .filter(p => statSync(p).uid === 0)
          .length
      ).map(([p]) => p)
      withRootOwned.forEach(p => {
        console.warn(`@lavamoat/protect env: unexpected global package ${p} has files owned by root`)
      })
    }
  }
}

