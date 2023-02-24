const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
} = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')
const { FEATURE } = require('./toggles')

const NPM = {
  RCFILE: '.npmrc',
  CONF: {
    SCRIPTS: 'ignore-scripts=true',
    BINS: 'bin-links=false',
  },
}
const YARN1 = {
  RCFILE: '.yarnrc',
  CONF: {
    SCRIPTS: 'ignore-scripts true',
    BINS: '--*.no-bin-links true',
  },
}
const YARN3 = {
  RCFILE: '.yarnrc.yml',
  CONF: {
    SCRIPTS: 'enableScripts: false',
  },
}


module.exports = {
  writeRcFile,
  areBinsBlocked,
  editPackageJson,
}

function addInstallParentDir(filename) {
  const rootDir = process.env.INIT_CWD || process.cwd()
  return path.join(rootDir, filename)
}

function isEntryPresent(entry, file) {
  const rcPath = addInstallParentDir(file)
  if (!existsSync(rcPath)) {
    return false
  }
  const rcFileContents = readFileSync(rcPath, 'utf8')
  return rcFileContents.includes(entry)
}

function writeRcFileContent({file, entry}) {
  const rcPath = addInstallParentDir(file)

  if (isEntryPresent(entry, file)) {
    console.log(`@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`)
  } else {
    appendFileSync(rcPath, entry + '\n')
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`)
  }
}

let binsBlockedMemo
/**
 * 
 * @param {Object} args 
 * @param {boolean} noMemoization - turn off memoization, make a fresh lookup
 * @returns {boolean}
 */
function areBinsBlocked({ noMemoization = false } = {}) {
  if(noMemoization || binsBlockedMemo === undefined) {
    binsBlockedMemo = isEntryPresent(NPM.CONF.BINS, NPM.RCFILE) || isEntryPresent(YARN1.CONF.BINS, YARN1.RCFILE)
    // Once yarn3 support via plugin comes in, this function would need to detect that, or cease to exist.
  }
  return binsBlockedMemo
}

function writeRcFile () {
  const yarnRcExists = existsSync(addInstallParentDir(YARN1.RCFILE))
  const yarnYmlExists = existsSync(addInstallParentDir(YARN3.RCFILE))
  const npmRcExists = existsSync(addInstallParentDir(NPM.RCFILE))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const configs = []
  if (yarnRcExists || yarnLockExists) {
    configs.push({
      file: YARN1.RCFILE,
      exists: yarnRcExists,
      entry: YARN1.CONF.SCRIPTS,
    })
    if(FEATURE.bins) {
      configs.push({
        file: YARN1.RCFILE,
        exists: yarnRcExists,
        entry: YARN1.CONF.BINS,
      })
    }
  }
  if (yarnYmlExists || yarnLockExists) {
    configs.push({
      file: YARN3.RCFILE,
      exists: yarnYmlExists,
      entry: YARN3.CONF.SCRIPTS,
    })
  }
  if (configs.length === 0) {
    // default to npm, because that's what everyone has anyway
    configs.push({
      file: NPM.RCFILE,
      exists: npmRcExists,
      entry: NPM.CONF.SCRIPTS,
    })
    if(FEATURE.bins) {
      configs.push({
        file: NPM.RCFILE,
        exists: npmRcExists,
        entry: NPM.CONF.BINS,
      })
    }
  }

  configs.forEach(writeRcFileContent)
}

function editPackageJson () {
  let cmd, cmdArgs

  if (existsSync('./.npmrc')) {
    cmd = 'npm'
    cmdArgs = ['install', '-d', '@lavamoat/preinstall-always-fail']
  } else {
    cmd = 'yarn'
    cmdArgs = ['add', '-D', '@lavamoat/preinstall-always-fail']
  }

  let result = spawnSync(cmd, cmdArgs, {})

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    console.log('@lavamoat/allow-scripts: Could not add @lavamoat/preinstall-always-fail.')
  } else {
    console.log('@lavamoat/allow-scripts: Added dependency @lavamoat/preinstall-always-fail.')
  }
  
  if(FEATURE.bins) {
    // no motivation to fix lint here, there's a better implementation of this in a neighboring branch
    // eslint-disable-next-line node/global-require
    const packageJson = require(addInstallParentDir('package.json'))
    if(!packageJson.scripts) {
      packageJson.scripts = {}
    }
    // If you think `node ` is redundant below, be aware that `./cli.js` won't work on Windows, 
    // but passing a unix-style path to node on Windows works fine.
    packageJson.scripts['allow-scripts'] = 'node ./node_modules/@lavamoat/allow-scripts/src/cli.js --experimental-bins'
    console.log('@lavamoat/allow-scripts: Adding allow-scripts as a package.json script with direct path.')
    writeFileSync(addInstallParentDir('package.json'), JSON.stringify(packageJson, null, 2))
  }
}
