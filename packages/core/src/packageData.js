'use strict'
const path = require('path')
const { callbackify } = require('util')
const through = require('through2').obj
const pathSeperator = require('path').sep
const { isCore } = require('resolve')

module.exports = {
  createPackageDataStream,
  decorateWithPackageData,
  packageDataForModule,
  packageVersionFromPath,
  packageNameFromPath,
}

function createPackageDataStream ({ rootPackageName } = {}) {
  return through(callbackify(async (data) => {
    decorateWithPackageData(data, rootPackageName)
    return data
  }))
}

function decorateWithPackageData (moduleData, rootPackageName) {
  const { packageName, packageVersion } = packageDataForModule(moduleData, rootPackageName)
  // legacy key
  moduleData.package = packageName
  // new keys
  moduleData.packageName = packageName
  moduleData.packageVersion = packageVersion
}

function packageDataForModule (moduleData, rootPackageName) {
  // handle core packages
  if (isCore(moduleData.id)) {
    return { packageName: moduleData.id, packageVersion: undefined }
  }
  // parse package name from file path
  const filepath = moduleData.file
  let packageName = packageNameFromPath(filepath)
  let packageVersion
  if (packageName) {
    packageVersion = packageVersionFromPath(packageName, filepath)
  } else {
    packageName = rootPackageName
  }
  return { packageName, packageVersion }
}

function packageVersionFromPath (packageName, filepath) {
  if (!packageName || !filepath) return
  const [packageParentPath] = filepath.split(`/${packageName}/`)
  const packagePath = path.join(packageParentPath, packageName, 'package.json')
  if (!packagePath) return
  if (packagePath === '/node_modules/one/package.json') debugger
  const { version: packageVersion } = require(packagePath)
  return packageVersion
}

function packageNameFromPath (file) {
  const segments = file.split(pathSeperator)
  const index = segments.lastIndexOf('node_modules')
  if (index === -1) return
  let moduleName = segments[index + 1]
  // check for scoped modules
  if (moduleName[0] === '@') {
    moduleName = segments[index + 1] + pathSeperator + segments[index + 2]
  }
  return moduleName
}
