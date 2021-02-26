const { existsSync, writeFileSync, readFile, createWriteStream } = require('fs')
const { promisify } = require('util')

const RCENTRY = 'ignore-scripts true'
const isYarn = existsSync('./yarn.lock')
const rcExists = existsSync('./.yarnrc')

const readFilePromise = promisify(readFile)

async function writeRcFile () {
  if (isYarn) {
    if (!rcExists) {
      writeFileSync('./.yarnrc', RCENTRY)
      console.log('@lavamoat/allow-scripts: created .yarnrc file with entry: ignore-scripts true. Run \'yarn add @lavamoat/preinstall-always-fail\' to make sure this configuration is correct.')
      return
    } else {
      const rcFileContents = await readFilePromise('./.yarnrc', 'utf8')
      if (rcFileContents.includes(RCENTRY)) {
        return
      }
      const rcStream = createWriteStream('./.yarnrc', { flags:'a' });
      if (rcFileContents.length) {
        rcStream.write('\n' + RCENTRY)
      } else {
        rcStream.write(RCENTRY)
      }
      console.log('@lavamoat/allow-scripts: added entry to .yarnrc: ignore-scripts true. Run \'yarn add @lavamoat/preinstall-always-fail\' to make sure this configuration is correct.')
    }
  }
}

writeRcFile()