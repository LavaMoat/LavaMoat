//@ts-check
const semver = require('semver')
const { existsSync, readFileSync, writeFileSync } = require('fs')
const path = require('path')

let packageJsonCache

const projectRelative = (relativePath) =>
  path.join(process.cwd(), relativePath)

const getPackageJson = () => {
  if (!packageJsonCache) {
    const pkgstr = readFileSync(projectRelative('package.json'), 'utf-8')
    try {
      packageJsonCache = JSON.parse(pkgstr)
    } catch(e) {
      console.error('Failed to parse package.json :(', e)
    }
  }
  return packageJsonCache
}

const writePackageJson = (data) => {
  if (!packageJsonCache) {
    throw Error('package.json overwrite attempted prior to reading')
  }
  try {
    writeFileSync(projectRelative('package.json'), JSON.stringify(data, null, 2), { encoding: 'utf-8' })
  } catch(e) {
    console.error('Failed to write package.json ;(')
    throw e
  }
}

/**
 * @typedef {'npm' | 'pnpm' | 'yarn1' | 'yarn3'} PkgM
 */
/**
 * @return {PkgM}
 */
function detectPkgManager() {
  const configFilesMapping = {
    yarnUncertain: [
      'yarn.lock',
    ],
    yarn1: [
      '.yarnrc',
    ],
    yarn3: [
      '.yarnrc.yml',
    ],
    npm: [
      '.npmrc',
      'package-lock.json',
    ],
    pnpm: [
      'pnpm-workspace.yaml',
      '.pnpmfile.cjs',
    ],
  }
  // detect by presence of configuration files
  const pkgManagersFound = new Set(Object.entries(configFilesMapping)
    .filter(
      ([_, files]) => files.map(projectRelative).some(existsSync)
    )
    .map(([name]) => name)
  )

  // detect by configured engines in package.json
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

  if (pkgManagersFound.has('yarnUncertain')) {
    // ok, so which yarn could that be? more likely yarn1
    pkgManagersFound.delete('yarnUncertain')
    pkgManagersFound.add('yarn1')
  }

  return /** @type {PkgM} */  (Array.from(pkgManagersFound).sort().reverse()[0] || 'npm')
}

module.exports = {
  detectPkgManager,
  getPackageJson,
  projectRelative,
  writePackageJson,
}
