const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
      } = require('fs')
const { spawnSync } = require('child_process')
const path = require('path')

module.exports = {
  writeRcFile,
  patchPackageJson
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

function writeRcFile (pkgManagerDefault = 'npm') {
  const yarnRcExists = existsSync(addInstallParentDir('.yarnrc'))
  const yarnYmlExists = existsSync(addInstallParentDir('.yarnrc.yml'))
  const npmRcExists = existsSync(addInstallParentDir('.npmrc'))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const configs = []
  if (yarnRcExists || yarnLockExists || pkgManagerDefault === 'yarn1') {
    configs.push({
      file: ".yarnrc",
      exists: yarnRcExists,
      entry: "ignore-scripts true",
    })
  }
  if (yarnYmlExists || yarnLockExists|| pkgManagerDefault === 'yarn3') {
    configs.push({
      file: ".yarnrc.yml",
      exists: yarnYmlExists,
      entry: "enableScripts: false",
    })
  }
  if (configs.length === 0) {
    // default to npm, because that's what everyone has anyway
    configs.push({
      file: ".npmrc",
      exists: npmRcExists,
      entry: "ignore-scripts=true",
    })
  }

  configs.forEach(writeRcFileContent)
}

function updatePackageJson(input) {
  const p = path.join(process.cwd(), 'package.json')
  const oldConf = JSON.parse(readFileSync(p, { encoding: 'utf-8' }))
  const mergedConf = { ...oldConf }
  for (const [k, v] of Object.entries(input)) {
    oldConf[k] = typeof v === 'object' && typeof oldConf[k] === 'object'
      ? { ...oldConf[k], ...v }
      : v
  }
  writeFileSync(p, JSON.stringify(mergedConf, undefined, 2), { encoding: 'utf-8' })
}

function patchPackageJson () {
  updatePackageJson({
    scripts: {
      'lavamoat-postinstall': './node_modules/@lavamoat/allow-scripts/src/cli.js',
    },
    devDependencies: {
      '@lavamoat/preinstall-always-fail': 'latest',
    }
  })
  console.log('@lavamoat/allow-scripts:: Added dependency @lavamoat/preinstall-always-fail. You can now run your package manager to complete installation.')
}
