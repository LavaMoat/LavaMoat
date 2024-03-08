const util = require('node:util')
const execFile = util.promisify(require('node:child_process').execFile)
const { promises: fs } = require('node:fs')
const { resolve, join } = require('node:path')

module.exports = {
  downloadPackage,
}

async function downloadPackage(packageName) {
  const downloadDir = resolve(join(__dirname, '..', 'downloads'))
  const packageDir = `${downloadDir}/${packageName}`
  await fs.rmdir(packageDir, { recursive: true })
  await execFile(join(__dirname, 'download.sh'), [packageName, packageDir])
}
