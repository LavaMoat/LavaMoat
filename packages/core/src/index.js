const {
  generatePrelude,
  generateKernel
} = require('./generatePrelude')
const { packageDataForModule, packageNameFromPath } = require('./packageData')
const { createModuleInspector, getDefaultPaths } = require('./generatePolicy')
const { parseForPolicy } = require('./parseForPolicy')
const { LavamoatModuleRecord } = require('./moduleRecord')
const { loadPolicy } = require('./loadPolicy')
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
  parseForPolicy,
  loadPolicy,
  mergePolicy,
  getDefaultPaths,
  applySourceTransforms,
  // module record class
  LavamoatModuleRecord
}
