const {
  generatePrelude,
  generateKernel
} = require('./generatePrelude')
const { packageDataForModule, createPackageDataStream } = require('./packageData')
const { createConfigSpy, createModuleInspector } = require('./generateConfig')

module.exports = {
  // generating the kernel
  generatePrelude,
  generateKernel,
  // decorating moduleData with package data
  packageDataForModule,
  createPackageDataStream,
  // generating lavamoat config
  createConfigSpy,
  createModuleInspector
}
