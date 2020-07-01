const {
  generatePrelude,
  generateKernel
} = require('./generatePrelude')
const { packageDataForModule, createPackageDataStream, packageNameFromPath } = require('./packageData')
const { createConfigSpy, createModuleInspector } = require('./generateConfig')
const { parseForConfig } = require('./parseForConfig')

module.exports = {
  // generating the kernel
  generatePrelude,
  generateKernel,
  // decorating moduleData with package data
  packageNameFromPath,
  packageDataForModule,
  createPackageDataStream,
  // generating lavamoat config
  createConfigSpy,
  createModuleInspector,
  parseForConfig,
}
