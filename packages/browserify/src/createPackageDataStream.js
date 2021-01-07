const { callbackify } = require('util')
const through = require('through2').obj
const { packageDataForModule } = require('lavamoat-core')

module.exports = { createPackageDataStream }

function createPackageDataStream ({ rootPackageName = '<root>' } = {}) {
  return through(callbackify(async (data) => {
    decorateWithPackageData(data, rootPackageName)
    return data
  }))
}

function decorateWithPackageData (moduleData, rootPackageName) {
  const { packageName, packageVersion } = packageDataForModule(moduleData, rootPackageName)
  if (!packageName) throw new Error(`LavaMoat - invalid packageName for moduleId "${moduleData.id}"`)
  moduleData.packageName = packageName
  moduleData.packageVersion = packageVersion
}
