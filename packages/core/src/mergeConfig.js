const { reduceToTopmostApiCalls, objToMap, mapToObj } = require('lavamoat-tofu/src/util')
const mergeDeep = require('merge-deep')

module.exports = { mergeConfig }

function mergeConfig (configA, configB) {
  const mergedConfig = mergeDeep(configA, configB)
  Object.values(mergedConfig.resources).forEach((packageConfig) => {
    if ('globals' in packageConfig) {
      packageConfig.globals = dedupeConfigPaths(packageConfig.globals)
    }
    if ('builtin' in packageConfig) {
      packageConfig.builtin = dedupeConfigPaths(packageConfig.builtin)
    }
  })
  return mergedConfig
}

function dedupeConfigPaths (packageConfig) {
  const itemMap = objToMap(packageConfig)
  reduceToTopmostApiCalls(itemMap)
  return mapToObj(itemMap)
}
