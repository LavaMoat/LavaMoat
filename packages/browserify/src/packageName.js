const through = require('through2').obj
const packageNameFromPath = require('module-name-from-path')
const pathSeperator = require('path').sep
const { rootSlug } = require('./generateConfig')

module.exports = createPackageNameStream


function createPackageNameStream () {
  return through((data, _, cb) => {
    decorateWithPackageName(data)
    cb(null, data)
  })
}

function decorateWithPackageName (module) {
  const packageName = packageNameFromModule(module)
  module.package = packageName
}

function packageNameFromModule (module) {
  let path = module.file
  let packageName = packageNameFromPath(path)
  if (packageName) return packageName
  // detect if files are part of the entry and not from dependencies
  const filePathFirstPart = path.split(pathSeperator)[0]
  const isAppLevel = ['.', '..', ''].includes(filePathFirstPart)
  if (isAppLevel) return rootSlug
  // otherwise fail
  throw new Error(`Sesify - Config Autogen - Failed to parse module name. first part: "${filePathFirstPart}"`)
}
