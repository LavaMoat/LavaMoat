const {
  generatePrelude,
  generateKernel
} = require('./generatePrelude')
const { packageDataForModule, createPackageDataStream, packageNameFromPath } = require('./packageData')
const { createModuleInspector } = require('./generateConfig')
const { parseForConfig } = require('./parseForConfig')
const { LavamoatModuleRecord } = require('./moduleRecord')

module.exports = {
  // generating the kernel
  generatePrelude,
  generateKernel,
  // decorating moduleData with package data
  packageNameFromPath,
  packageDataForModule,
  createPackageDataStream,
  // generating lavamoat config
  createModuleInspector,
  parseForConfig,
  // module record class
  LavamoatModuleRecord
}
