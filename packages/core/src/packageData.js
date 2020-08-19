'use strict'
const path = require('path')
const pathSeperator = require('path').sep
const { isCore } = require('resolve')

module.exports = {
  packageDataForModule,
  packageVersionFromPath,
  packageNameFromPath
}

function packageDataForModule (moduleData, rootPackageName) {
  // handle core packages
  if (isCore(moduleData.id)) {
    return { packageName: moduleData.id, packageVersion: undefined }
  }
  // parse package name from file path
  const filepath = moduleData.file
  const packageName = packageNameFromPath(filepath) || rootPackageName
  const packageVersion = packageVersionFromPath(packageName, filepath)
  return { packageName, packageVersion }
}

function packageVersionFromPath (packageName, filepath) {
  if (!packageName || !filepath) return
  const [packageParentPath] = filepath.split(`/${packageName}/`)
  const packagePath = path.join(packageParentPath, packageName, 'package.json')
  if (!packagePath) return
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
