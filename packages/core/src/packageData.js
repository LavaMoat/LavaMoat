'use strict'
const path = require('path')
const through = require('through2').obj
const resolvePackagePath = require('resolve-package-path')
const pathSeperator = require('path').sep
const { isCore } = require('resolve')
const { rootSlug } = require('./generateConfig')

module.exports = {
  createPackageDataStream,
  decorateWithPackageData,
  packageDataForModule,
  packageVersionFromPath
}

function createPackageDataStream () {
  return through((data, _, cb) => {
    decorateWithPackageData(data)
    cb(null, data)
  })
}

function decorateWithPackageData (moduleData) {
  const { packageName, packageVersion } = packageDataForModule(moduleData)
  // legacy key
  moduleData.package = packageName
  // new keys
  moduleData.packageName = packageName
  moduleData.packageVersion = packageVersion
}

function packageDataForModule (moduleData) {
  // handle core packages
  if (isCore(moduleData.id)) {
    return { packageName: moduleData.id, packageVersion: undefined }
  }
  // parse package name from file path
  const path = moduleData.file
  let packageName = packageNameFromPath(path)
  let packageVersion
  if (packageName) {
    packageVersion = packageVersionFromPath(packageName, path)
  } else {
    // detect if files are part of the entry and not from dependencies
    const filePathFirstPart = path.split(pathSeperator)[0]
    const isRootLevel = ['.', '..', ''].includes(filePathFirstPart)
    // otherwise fail
    if (!isRootLevel) {
      throw new Error(`LavaMoat - Config Autogen - Failed to parse module name. first part: "${filePathFirstPart}" full path: "${path}"`)
    }
    packageName = rootSlug
  }
  return { packageName, packageVersion }
}

function packageVersionFromPath (packageName, path) {
  if (!packageName || !path) return
  const packagePath = resolvePackagePath(packageName, path)
  if (!packagePath) return
  const { version: packageVersion } = require(packagePath)
  return packageVersion
}

function packageNameFromPath (file) {
  const segments = file.split(path.sep)
  const index = segments.lastIndexOf('node_modules')
  if (index === -1) return
  let moduleName = segments[index + 1]
  // check for scoped modules
  if (moduleName[0] === '@') {
    moduleName = segments[index + 1] + path.sep + segments[index + 2]
  }
  return moduleName
}
