const {
  generatePrelude,
  generateKernel
} = require('./generatePrelude')
const { packageDataForModule, packageNameFromPath } = require('./packageData')
const { createModuleInspector, getDefaultPaths } = require('./generateConfig')
const { parseForConfig } = require('./parseForConfig')
const { LavamoatModuleRecord } = require('./moduleRecord')
const { mergePolicy } = require('./mergePolicy')
const { applySourceTransforms } = require('./sourceTransforms')

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
  mergePolicy,
  getDefaultPaths,
  applySourceTransforms,
  // module record class
  LavamoatModuleRecord
}
