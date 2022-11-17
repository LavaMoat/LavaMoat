//@ts-check
const semver = require('semver')
const promptly = require('promptly')
const { existsSync,
  appendFileSync,
  readFileSync,
  writeFileSync,
} = require('fs')
const path = require('path')
const setupScripts = require('./lib/setup-scripts')
const setupLockfileLint = require('./lib/setup-lint')
const installLavamoat = require('./lib/install-lavamoat')
const { getPackageJson,
  projectRelative,
} = require('./lib/utils')


const SUPPORTED_PKG_MANAGERS = ['npm','pnpm','yarn1','yarn3']

module.exports = {
  async protectProject(){
    try {
      const pkgManagerDefault = detectPkgManager()
      const pkgManagerChoice = await promptly.choose(`Which package manager are you using?`, SUPPORTED_PKG_MANAGERS, {
        default: pkgManagerDefault
      })

      if(await promptly.confirm(`Would you like to install protection against malicious scripts?`)) {
        await setupScripts(pkgManagerChoice)
      }
      if(await promptly.confirm(`Would you like to install a linter for your lockfile?`)) {
        await setupLockfileLint(pkgManagerChoice)
      }
      // TODO: ask the question in a way that it can protect CI and Node.js programs
      if(await promptly.confirm(`Would you like to install lavamoat-node for runtime protections?`)) {
        await installLavamoat(pkgManagerChoice)
      }
      // We could attempt to detect package.json->scripts->* and wrap that with lavamoat, but I don't know how effective that would be


    } catch (error) {
      console.error(`Sorry, that didn't work out...`, error)
    }
  }
}

/**
 * @typedef {'npm' | 'pnpm' | 'yarn1' | 'yarn3'} PkgM
 */
/**
 * @return {PkgM}
 */
function detectPkgManager(){
  const pkgManagersFound = new Set()
  const cfg = detectConfigFiles()
  if (cfg['yarn.lock']) {
    pkgManagersFound.add('yarnUncertain')
  }
  if (cfg['.yarnrc']) {
    pkgManagersFound.add('yarn1')
  }
  if (cfg['yarnrc.yml']) {
    pkgManagersFound.add('yarn3')
  }
  if (cfg['package-log.json'] || cfg['.npmrc']) {
    pkgManagersFound.add('npm')
  }
  if (cfg['.pnpmfile.cjs'] || cfg['pnpm-workspace.yml']) {
    pkgManagersFound.add('pnpm')
  }

  const pkgConf = getPackageJson()
  ;(['npm', 'yarn', 'pnpm']).map(engine => ([engine, pkgConf?.engines?.[engine]]))
    .filter(([,version]) => !!version)
    .map(([e, v]) => {
      if (e === 'yarn') {
        switch (semver.major(v)) {
          case 1:
            return 'yarn1'
          case 3:
            return 'yarn3'
          default:
            return 'yarnUncertain'
        }
      }
      return e
    }).forEach(e => {
      pkgManagersFound.add(e)
    })

    if (pkgManagersFound['yarn1'] || pkgManagersFound['yarn3']) {
      pkgManagersFound.delete('yarnUncertain')
    }

  /*
   "engines": {
    "node": ">=4.4.7 <7.0.0",
    "zlib": "^1.2.8",
    "yarn": "^0.14.0"
  }
   "engines": {
        "node": ">=10",
        "pnpm": ">=3"
    }
     */

  if (pkgManagersFound.has('yarnUncertain')) {
    // ok, so which yarn could that be? more likely yarn1
    pkgManagersFound.delete('yarnUncertain')
    pkgManagersFound.add('yarn1')
  }

  return /** @type {PkgM} */  (Object.keys(pkgManagersFound).sort().reverse()[0] || 'npm')
}

function detectConfigFiles(){
  return {
    '.pnpmfile.cjs': existsSync(projectRelative('.pnpmfile.cjs')),
    'pnpm-workspace.yml': existsSync(projectRelative('pnpm-workspace.yaml')) || existsSync(projectRelative('pnpm-workspace.yml')),
    '.yarnrc': existsSync(projectRelative('.yarnrc')),
    'yarnrc.yml': existsSync(projectRelative('.yarnrn.yaml')) || existsSync(projectRelative('.yarnrc.yml')),
    'yarn.lock': existsSync(projectRelative('yarn.lock')),
    '.npmrc': existsSync(projectRelative('.npmrc')),
    'package-lock.json': existsSync(projectRelative('package-lock.json')),
  }
}

