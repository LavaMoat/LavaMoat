#!/usr/bin/env node

const { existsSync,
        writeFileSync,
        createWriteStream,
        promises: { readFile }
      } = require('fs')
const path = require('path')

const RC_ENTRY = 'ignore-scripts true'

function addInstallParentDir(filename) {
  return path.join(process.env.INIT_CWD, filename)
}

async function writeRcFile () {
  const yarnRcExists = existsSync(addInstallParentDir('.yarnrc'))
  const npmRcExists = existsSync(addInstallParentDir('.npmrc'))

  // Should we better check for npmRcExists instead?
  var rcFile = existsSync('./package-lock.json')? '.npmrc' : '.yarnrc'
  var rcPath = addInstallParentDir(rcFile)

  if (!yarnRcExists && !npmRcExists) {
    writeFileSync(rcPath, RC_ENTRY + '\n')

    // This output will only appear in yarn with the `--verbose` flag.
    console.log(`@lavamoat/allow-scripts: created ${rcFile} file with entry: ignore-scripts true. Run \'yarn add -D @lavamoat/preinstall-always-fail\' to make sure this configuration is correct.`)

    return
  }

  const rcFileContents = await readFile(rcPath, 'utf8')
  if (rcFileContents.includes(RC_ENTRY)) {
    return
  }

  const rcStream = createWriteStream(rcPath, { flags:'a' });
  if (rcFileContents.length) {
    rcStream.write('\n' + RC_ENTRY + '\n')
  } else {
    rcStream.write(RC_ENTRY)
  }

  // This output will only appear in yarn with the `--verbose` flag.
  console.log(`@lavamoat/allow-scripts: added entry to ${rcFile}: ignore-scripts true. Run \'yarn add -D @lavamoat/preinstall-always-fail\' to make sure this configuration is correct.`)
}

writeRcFile()
  .catch(err => {
  console.log('Exception: writeRcFile:', err)
  process.exit(1)
})
