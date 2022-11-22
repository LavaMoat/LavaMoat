const colors = require('ansi-colors')
const { diffJson } = require('diff')
const { existsSync,
        appendFileSync,
        readFileSync,
        writeFileSync,
      } = require('fs')
const path = require('path')
const { setDryRun, performEffect } = require('./effect')

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
    performEffect(`create config file ${rcPath}`, () => {
      writeFileSync(rcPath, entry + '\n')
    })
    console.log(`@lavamoat/allow-scripts: created ${rcPath} file with entry: ${entry}.`)
    return
  }

  const rcFileContents = readFileSync(rcPath, 'utf8')
  if (rcFileContents.includes(entry)) {
    console.log(`@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`)
  } else {
    performEffect(`append to ${rcPath}`, () => {
      appendFileSync(rcPath, entry + '\n')
    })
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`)
  }
}

function writeRcFile (pkgManagerDefault = 'npm', dryRun = false) {
  setDryRun(dryRun)
  const yarnRcExists = existsSync(addInstallParentDir('.yarnrc'))
  const yarnYmlExists = existsSync(addInstallParentDir('.yarnrc.yml'))
  const npmRcExists = existsSync(addInstallParentDir('.npmrc'))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const configs = []
  if (yarnRcExists || yarnLockExists || pkgManagerDefault === 'yarn1') {
    configs.push({
      file: '.yarnrc',
      exists: yarnRcExists,
      entry: 'ignore-scripts true',
    })
  }
  if (yarnYmlExists || yarnLockExists|| pkgManagerDefault === 'yarn3') {
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

  configs.forEach(c => writeRcFileContent(c))
}

function updatePackageJson(input) {
  const p = addInstallParentDir('package.json')
  const oldConf = JSON.parse(readFileSync(p, { encoding: 'utf-8' }))
  const mergedConf = {
    ...oldConf,
    ...Object.fromEntries(
      Object.entries(input)
      .map(([sectionName, section]) => [
        sectionName,
        {
          ...oldConf[sectionName],
          ...section
        }
      ]))
  }

  const output = JSON.stringify(mergedConf, undefined, 2)
  const diff = prettyDiffJson(oldConf, mergedConf)
  if (diff.length > 0) {
    console.log(`@lavamoat/allow-scripts: Modified ${p}:`)
    process.stdout.write(diff + '\n')
  } else {
    console.log(`@lavamoat/allow-scripts: No changes to ${p}.`)
  }
  performEffect('write package.json', () => {
    writeFileSync(p, output, { encoding: 'utf-8' })
  })
}

function prettyDiffJson(x, y, contextLines=2) {
  const diff = diffJson(JSON.stringify(x, undefined, 2), JSON.stringify(y, undefined, 2))
  if (diff.length === 1 && !diff[0].added && !diff[0].removed) {
    return ''
  }
  return diff.map((hunk, i) => {
    if (hunk.removed || hunk.added) {
      return hunk
    }
    const lines = hunk.value.split('\n')
    if (lines.length <= contextLines*2) {
      return hunk
    }
    let ls = []
    if (i !== 0) {
      ls = ls.concat(lines.splice(0,contextLines))
      if (i !== diff.length-1) {
        ls.push('[...]')
      }
    }
    if (i !== diff.length-1) {
      ls = ls.concat(lines.splice(lines.length-contextLines))
    }
    return {
      ...hunk,
      value: ls.join('\n')
    }
  }).map(hunk =>
    colors[hunk.added ? 'green' : (hunk.removed ? 'red' : 'gray')](
      hunk.value
    )
  ).join('')
}

function patchPackageJson (dryRun = false) {
  setDryRun(dryRun)
  updatePackageJson({
    scripts: {
      'lavamoat-postinstall': './node_modules/@lavamoat/allow-scripts/src/cli.js',
    },
    devDependencies: {
      '@lavamoat/preinstall-always-fail': 'latest',
    }
  })
}
