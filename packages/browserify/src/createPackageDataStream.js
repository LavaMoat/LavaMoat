const { callbackify } = require('util')
const through = require('through2').obj
const { getPackageNameForModulePath } = require('@lavamoat/aa')

module.exports = { createPackageDataStream }

function createPackageDataStream ({ getCanonicalNameMap } = {}) {
  return through(callbackify(async (moduleData) => {
    const canonicalNameMap = await getCanonicalNameMap()
    decorateWithPackageData(moduleData, canonicalNameMap)
    return moduleData
  }))
}

function decorateWithPackageData (moduleData, canonicalNameMap) {
  const moduleFilePath = moduleData.file
  if (moduleFilePath === undefined) {
    throw new Error(`module "${moduleData.id}" did not have a file path defined (moduleData.file)`)
  }
  const packageName = getPackageNameForModulePath(canonicalNameMap, moduleFilePath)
  if (!packageName) throw new Error(`LavaMoat - invalid packageName for moduleId "${moduleData.id}"`)
  moduleData.packageName = packageName
}
