const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const { promises: fs } = require('fs')
const { resolve, join } = require('path')

module.exports = {
  downloadPackage,
}

async function downloadPackage(packageName) {
  const downloadDir = resolve(join(__dirname, '..', 'downloads'))
  const packageDir = `${downloadDir}/${packageName}`
  await fs.rmdir(packageDir, { recursive: true })
  await execFile(join(__dirname, 'download.sh'), [packageName, packageDir])
}
