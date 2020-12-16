const { reduceToTopmostApiCalls, objToMap, mapToObj } = require('../../tofu/src/util')
const mergeDeep = require('merge-deep')

module.exports = { mergeConfigDeep }

function mergeConfigDeep (configA, configB) {
  const mergedConfig = mergeDeep(configA, configB)
  Object.values(mergedConfig.resources).forEach((packageConfig) => {
    packageConfig.globals = dedupeConfigPaths(packageConfig.globals)
    packageConfig.builtin = dedupeConfigPaths(packageConfig.builtin)
  })
  return mergedConfig
}

function dedupeConfigPaths (packageConfig) {
  const itemMap = objToMap(packageConfig)
  reduceToTopmostApiCalls(itemMap)
  return mapToObj(itemMap)
}