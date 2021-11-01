const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
        createWriteStream,
      } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

const yarnRcExists = existsSync(addInstallParentDir('.yarnrc'))
const npmRcExists = existsSync(addInstallParentDir('.npmrc'))

module.exports = {
  writeRcFile,
  addPreinstallAFDependency
}

function addInstallParentDir(filename) {
  return path.join(process.env.INIT_CWD, filename)
}

function writeRcFile () {
  var rcFile, rcEntry
  if (npmRcExists) {
    rcFile = '.npmrc'
    rcEntry = 'ignore-scripts=true'
  } else {
    rcFile = '.yarnrc'
    rcEntry = 'ignore-scripts true'
  }

  var rcPath = addInstallParentDir(rcFile)

  if (!yarnRcExists && !npmRcExists) {
    writeFileSync(rcPath, rcEntry + '\n')
    console.log(`@lavamoat/allow-scripts: created ${rcPath} file with entry: ${rcEntry}.`)
    return
  }

  const rcFileContents = readFileSync(rcPath, 'utf8')
  if (rcFileContents.includes(rcEntry)) {
    console.log(`@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${rcEntry}.`)
  } else {
    appendFileSync(rcPath, rcEntry + '\n')
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${rcEntry}.`)
  }
}

function addPreinstallAFDependency () {
  var result, cmd, cmdArgs

  if (existsSync('./.npmrc')) {
    cmd = 'npm'
    cmdArgs = ['install', '-d', '@lavamoat/preinstall-always-fail']
  } else {
    cmd = 'yarn'
    cmdArgs = ['add', '-D', '@lavamoat/preinstall-always-fail']
  }

  var result = spawnSync(cmd, cmdArgs, {})

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status);
  } else {
    console.log('@lavamoat/allow-scripts:: Added dependency @lavamoat/preinstall-always-fail.')
  }
}
