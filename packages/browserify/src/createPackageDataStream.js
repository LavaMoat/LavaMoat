const { callbackify } = require('util')
const through = require('through2').obj
const { packageDataForModule } = require('lavamoat-core')

module.exports = { createPackageDataStream }

function createPackageDataStream ({ rootPackageName } = {}) {
  return through(callbackify(async (data) => {
    decorateWithPackageData(data, rootPackageName)
    return data
  }))
}

function decorateWithPackageData (moduleData, rootPackageName) {
  const { packageName, packageVersion } = packageDataForModule(moduleData, rootPackageName)
  moduleData.packageName = packageName
  moduleData.packageVersion = packageVersion
}
