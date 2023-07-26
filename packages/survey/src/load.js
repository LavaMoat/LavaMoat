const util = require('util')
const { promises: fs } = require('fs')
const { resolve } = require('path')
const { downloadPackage } = require('./downloadPackage.js')
const { fileExists } = require('./util.js')

module.exports = {
  loadPackage,
}


async function loadPackage (packageName) {
  const downloadDir = resolve(__dirname + '/../downloads')
  const packageDir = `${downloadDir}/${packageName}`
  const packageJsonPath = `${packageDir}/package.json`
  const exists = await fileExists(packageJsonPath)
  if (!exists) {
    console.info(`downloading ${packageName}`)
    await downloadPackage(packageName)
  }
  const package = require(packageJsonPath)
  return { package, packageDir }
}

