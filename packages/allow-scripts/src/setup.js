const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
        createWriteStream,
      } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

module.exports = {
  configureProject
}

function configureProject({ pkg }) {

  writeRcFile(pkg)
  addPreinstallAFDependency(pkg)
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

function writeRcFile (pkg) {
  const yarnRcExists = existsSync(addInstallParentDir('.yarnrc'))
  const yarnYmlExists = existsSync(addInstallParentDir('.yarnrc.yml'))
  const npmRcExists = existsSync(addInstallParentDir('.npmrc'))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const configs = []
  if (
    pkg === "yarn" ||
    (!pkg && (yarnRcExists || yarnYmlExists || yarnLockExists))
  ) {
    configs.push({
      file: ".yarnrc",
      exists: yarnRcExists,
      entry: "ignore-scripts true",
    });
    configs.push({
      file: ".yarnrc.yml",
      exists: yarnYmlExists,
      entry: "enableScripts: false",
    });
  }
  if (configs.length === 0) {
    // default to npm, because that's what everyone other than yarn use
    configs.push({
      file: ".npmrc",
      exists: npmRcExists,
      entry: "ignore-scripts=true",
    })
  }

  configs.forEach(writeRcFileContent)
}

function addPreinstallAFDependency (pkg) {
  let cmd, cmdArgs

  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  switch(pkg) {
    case 'npm': 
      cmd = 'npm'
      cmdArgs = ['install', '-D']
      break;
    case 'yarn': 
      cmd = 'yarn'
      cmdArgs = ['add', '-D']
      break;
    case 'pnpm': 
      cmd = 'pnpm'
      cmdArgs = ['add', '-D']
      break;
    default: 
      if(!yarnLockExists) {
        cmd = 'npm'
        cmdArgs = ['install', '-D']
      } else {
        cmd = 'yarn'
        cmdArgs = ['add', '-D']
      }

  }

  cmdArgs.push('@lavamoat/preinstall-always-fail')
  cmdArgs.push('@lavamoat/allow-scripts')

  let result = spawnSync(cmd, cmdArgs, {})

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status);
  } else {
    console.log('@lavamoat/allow-scripts:: Added dependency @lavamoat/preinstall-always-fail.')
  }
}
