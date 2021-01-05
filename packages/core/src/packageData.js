'use strict'
const path = require('path')
const pathSeperator = require('path').sep
const { isCore } = require('resolve')
const { createRequire, createRequireFromPath } = require('module')

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
  // attempt to load package path
  let packageVersion
  try {
    const NODE_MAJOR_VERSION = process.version.split('.')[0].split('v')[1]; 
    console.log(typeof NODE_MAJOR_VERSION)
    let requireFn
    if (NODE_MAJOR_VERSION < 12) {
      requireFn = createRequireFromPath(path.join(packageParentPath, packageName))
    } else {
      requireFn = createRequire(path.join(packageParentPath, packageName))
    }
    const packageJson = requireFn('package.json')
    packageVersion = packageJson.version
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err
    }
  }
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
