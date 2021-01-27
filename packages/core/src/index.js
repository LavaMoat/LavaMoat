const {
  generatePrelude,
  generateKernel
} = require('./generatePrelude')
const { packageDataForModule, packageNameFromPath } = require('./packageData')
const { createModuleInspector, getDefaultPaths } = require('./generateConfig')
const { parseForConfig } = require('./parseForConfig')
const { LavamoatModuleRecord } = require('./moduleRecord')
const { mergeConfig } = require('./mergeConfig')

module.exports = {
  // generating the kernel
  generatePrelude,
  generateKernel,
  // decorating moduleData with package data
  packageNameFromPath,
  packageDataForModule,
  // generating lavamoat config
  createModuleInspector,
  parseForConfig,
  mergeConfig,
  getDefaultPaths,
  // module record class
  LavamoatModuleRecord
}
