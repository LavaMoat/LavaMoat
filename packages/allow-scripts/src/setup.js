const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
        createWriteStream,
      } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

module.exports = {
  writeRcFile,
  addPreinstallAFDependency
}

function addInstallParentDir(filename) {
  const rootDir = process.env.INIT_CWD || process.cwd()
  return path.join(rootDir, filename)
}

function writeRcFileContent({file, exists, entry}){
  let rcPath = addInstallParentDir(file)

  if (!exists) {
    writeFileSync(rcPath, entry + '\n')
    console.log(`@lavamoat/allow-scripts: created ${rcPath} file with entry: ${entry}.`)
    return
  }

  const rcFileContents = readFileSync(rcPath, 'utf8')
  if (rcFileContents.includes(entry)) {
    console.log(`@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`)
  } else {
    appendFileSync(rcPath, entry + '\n')
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`)
  }
}

function writeRcFile () {
  const yarnRcExists = existsSync(addInstallParentDir('.yarnrc'))
  const yarnYmlExists = existsSync(addInstallParentDir('.yarnrc.yml'))
  const npmRcExists = existsSync(addInstallParentDir('.npmrc'))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const configs = []
  if (yarnRcExists || yarnLockExists) {
    configs.push({
      file: '.yarnrc',
      exists: yarnRcExists,
      entry: 'ignore-scripts true',
    })
  }
  if (yarnYmlExists || yarnLockExists) {
    configs.push({
      file: '.yarnrc.yml',
      exists: yarnYmlExists,
      entry: 'enableScripts: false',
    })
  }
  if (configs.length === 0) {
    // default to npm, because that's what everyone has anyway
    configs.push({
      file: '.npmrc',
      exists: npmRcExists,
      entry: 'ignore-scripts=true',
    })
  }

  configs.forEach(writeRcFileContent)
}

function addPreinstallAFDependency () {
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
    process.exit(result.status)
  } else {
    console.log('@lavamoat/allow-scripts:: Added dependency @lavamoat/preinstall-always-fail.')
  }
}
