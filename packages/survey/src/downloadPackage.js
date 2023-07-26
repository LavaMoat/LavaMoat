const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const { promises: fs } = require('fs')
const { resolve } = require('path')

module.exports = {
  downloadPackage,
}


async function downloadPackage (packageName) {
  const downloadDir = resolve(__dirname + '/../downloads')
  const packageDir = `${downloadDir}/${packageName}`
  await fs.rmdir(packageDir, { recursive: true })
  const { stdout, stderr } = await execFile(__dirname + '/download.sh', [packageName, packageDir])
  // console.log(stdout)
  // console.info(stderr)
}
