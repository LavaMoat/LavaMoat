const { resolve } = require('node:path')
const { downloadPackage } = require('./downloadPackage.js')
const { fileExists } = require('./util.js')

module.exports = {
  loadPackage,
}

async function loadPackage(packageName) {
  const downloadDir = resolve(__dirname, '..', 'downloads')
  const packageDir = `${downloadDir}/${packageName}`
  const packageJsonPath = `${packageDir}/package.json`
  const exists = await fileExists(packageJsonPath)
  if (!exists) {
    console.info(`downloading ${packageName}`)
    await downloadPackage(packageName)
  }
  const pkg = require(packageJsonPath)
  return { package: pkg, packageDir }
}
