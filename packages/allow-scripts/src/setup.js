const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
      } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')
const { FT } = require('./toggles')

const NPM = {
  RCFILE: '.npmrc',
  CONF: {
    SCRIPTS: 'ignore-scripts=true',
    BINS: 'bin-links=false'
  },
}
const YARN1 = {
  RCFILE: '.yarnrc',
  CONF: {
    SCRIPTS: 'ignore-scripts true',
    BINS: '--*.no-bin-links true'
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
  editPackageJson
}

function addInstallParentDir(filename) {
  const rootDir = process.env.INIT_CWD || process.cwd()
  return path.join(rootDir, filename)
}

function isEntryPresent(entry, file) {
  const rcPath = addInstallParentDir(file)
  process._rawDebug({
    cwd: process.cwd(),
    rcPath,
    ex: existsSync(rcPath)
  })
  if (!existsSync(rcPath)) {
    return false
  }
  const rcFileContents = readFileSync(rcPath, 'utf8')
  process._rawDebug({ isentry: rcFileContents.includes(entry)})
  return rcFileContents.includes(entry)
}

function writeRcFileContent({file, entry}){
  const rcPath = addInstallParentDir(file)

  if (isEntryPresent(entry, file)) {
    console.log(`@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`)
  } else {
    appendFileSync(rcPath, entry + '\n')
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`)
  }
}

let binsBlockedMemo;
/**
 * 
 * @param {Object} args 
 * @param {boolean} noMemoization - turn off memoization, make a fresh lookup
 * @returns {boolean}
 */
function areBinsBlocked({ noMemoization = false } = {}) {
  if(noMemoization || binsBlockedMemo === undefined){
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
    if(FT.bins) {
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
    if(FT.bins) {
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
    process.stderr.write(result.stderr);
    process.exit(result.status);
  } else {
    console.log('@lavamoat/allow-scripts:: Added dependency @lavamoat/preinstall-always-fail.')
  }

  const packageJson = require(addInstallParentDir('package.json'))
  if(!packageJson.scripts){
    packageJson.scripts = {};
  }
  packageJson.scripts['allow-scripts'] = './node_modules/@lavamoat/allow-scripts/src/cli.js'
  writeFileSync(addInstallParentDir('package.json'), JSON.stringify(packageJson, null, 2))
}
