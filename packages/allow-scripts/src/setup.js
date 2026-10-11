const {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} = require('node:fs')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const { FEATURE } = require('./toggles')

const NPM = {
  RCFILE: '.npmrc',
  CONF: {
    SCRIPTS: 'ignore-scripts=true',
    BINS: 'bin-links=false',
    GIT: 'allow-git=root',
  },
}
const YARN1 = {
  RCFILE: '.yarnrc',
  CONF: {
    SCRIPTS: 'ignore-scripts true',
    BINS: '--*.no-bin-links true',
  },
}
const YARN3PLUS = {
  RCFILE: '.yarnrc.yml',
  CONF: {
    SCRIPTS: 'enableScripts: false',
    GIT: 'approvedGitRepositories: []',
  },
}

/**
 * @type {boolean}
 */
let binsBlockedMemo

module.exports = {
  areBinsBlocked,
  editPackageJson,
  writeRcFile,
}

/**
 * @param {AreBinsBlockedParams} args
 * @returns {boolean}
 */
function areBinsBlocked({ noMemoization = false } = {}) {
  if (noMemoization || binsBlockedMemo === undefined) {
    binsBlockedMemo =
      isEntryPresent(NPM.CONF.BINS, NPM.RCFILE) ||
      isEntryPresent(YARN1.CONF.BINS, YARN1.RCFILE)
    // Once yarn3+ support via plugin comes in, this function would need to detect that, or cease to exist.
  }
  return binsBlockedMemo
}

function writeRcFile() {
  const yarnRcExists = existsSync(addInstallParentDir(YARN1.RCFILE))
  const yarnYmlExists = existsSync(addInstallParentDir(YARN3PLUS.RCFILE))
  const npmRcExists = existsSync(addInstallParentDir(NPM.RCFILE))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const packageJson = /** @type {import('type-fest').PackageJson} */ (
    require(addInstallParentDir('package.json'))
  )

  const configs = []
  if (yarnRcExists || yarnLockExists) {
    configs.push({
      file: YARN1.RCFILE,
      exists: yarnRcExists,
      entry: YARN1.CONF.SCRIPTS,
    })
    if (FEATURE.bins) {
      configs.push({
        file: YARN1.RCFILE,
        exists: yarnRcExists,
        entry: YARN1.CONF.BINS,
      })
    }
  }
  if (yarnYmlExists || yarnLockExists) {
    configs.push({
      file: YARN3PLUS.RCFILE,
      exists: yarnYmlExists,
      entry: YARN3PLUS.CONF.SCRIPTS,
    })
    if (
      packageJson.packageManager &&
      versionAtLeast(packageJson.packageManager, '4.14.0')
    ) {
      configs.push({
        file: YARN3PLUS.RCFILE,
        exists: yarnYmlExists,
        entry: YARN3PLUS.CONF.GIT,
      })
    }
  }
  if (configs.length === 0) {
    // default to npm, because that's what everyone has anyway
    configs.push({
      file: NPM.RCFILE,
      exists: npmRcExists,
      entry: NPM.CONF.SCRIPTS,
    })
    configs.push({
      file: NPM.RCFILE,
      exists: npmRcExists,
      entry: NPM.CONF.GIT,
    })
    if (FEATURE.bins) {
      configs.push({
        file: NPM.RCFILE,
        exists: npmRcExists,
        entry: NPM.CONF.BINS,
      })
    }
  }

  configs.forEach(writeRcFileContent)
}

/**
 * @param {string} name
 */
function addPackage(name) {
  let cmd, cmdArgs

  if (existsSync('./.npmrc')) {
    cmd = 'npm'
    cmdArgs = ['install', '-D', name]
  } else {
    cmd = 'yarn'
    cmdArgs = ['add', '-D', name]
  }

  const result = spawnSync(cmd, cmdArgs, {})

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    console.log(`@lavamoat/allow-scripts: Could not add ${name}.`)
  } else {
    console.log(`@lavamoat/allow-scripts: Added dev dependency ${name}.`)
  }
}

function editPackageJson() {
  addPackage('@lavamoat/preinstall-always-fail')
  addPackage('@lavamoat/allow-scripts')

  if (FEATURE.bins) {
    // no motivation to fix lint here, there's a better implementation of this in a neighboring branch
    const packageJson = /** @type {import('type-fest').PackageJson} */ (
      require(addInstallParentDir('package.json'))
    )
    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }
    // If you think `node ` is redundant below, be aware that `./cli.js` won't work on Windows,
    // but passing a unix-style path to node on Windows works fine.
    packageJson.scripts['allow-scripts'] =
      'node ./node_modules/@lavamoat/allow-scripts/src/cli.js --experimental-bins'
    console.log(
      '@lavamoat/allow-scripts: Adding allow-scripts as a package.json script with direct path.'
    )
    writeFileSync(
      addInstallParentDir('package.json'),
      JSON.stringify(packageJson, null, 2)
    )
  }
}

// internals

/**
 * Checks if the packageManager field's yarn version is at least the given
 * minimum version.
 *
 * @param {string} packageManager - E.g. "yarn@4.14.0" or
 *   "yarn@4.14.0+sha256.abc"
 * @param {string} minVersion - E.g. "4.14.0"
 * @returns {boolean}
 */
function versionAtLeast(packageManager, minVersion) {
  const versionMatch = packageManager.match(/^yarn@(\d+)\.(\d+)\.(\d+)/)
  if (!versionMatch) return false
  const [, major, minor, patch] = versionMatch.map(Number)

  const minMatch = minVersion.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!minMatch) return false
  const [, minMajor, minMinor, minPatch] = minMatch.map(Number)

  if (major !== minMajor) return false
  if (minor !== minMinor) return minor > minMinor
  return patch >= minPatch
}

/**
 * @param {string} filename
 * @returns {string}
 */
function addInstallParentDir(filename) {
  const rootDir = process.env.INIT_CWD || process.cwd()
  return path.join(rootDir, filename)
}

/**
 * @param {string} entry
 * @param {string} file
 * @returns {boolean}
 */
function isEntryPresent(entry, file) {
  const rcPath = addInstallParentDir(file)
  if (!existsSync(rcPath)) {
    return false
  }
  const rcFileContents = readFileSync(rcPath, 'utf8')
  return rcFileContents.includes(entry)
}

/**
 * @param {WriteRcFileContentParams} params
 */
function writeRcFileContent({ file, entry }) {
  const rcPath = addInstallParentDir(file)

  if (isEntryPresent(entry, file)) {
    console.log(
      `@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`
    )
  } else {
    appendFileSync(rcPath, entry + '\n')
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`)
  }
}
