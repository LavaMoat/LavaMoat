const {
  generateKernel
} = require('./generateKernel')
const { createModuleInspector, getDefaultPaths } = require('./generatePolicy')
const { parseForPolicy } = require('./parseForPolicy')
const { LavamoatModuleRecord } = require('./moduleRecord')
const { loadPolicy } = require('./loadPolicy')
const { mergePolicy } = require('./mergePolicy')
const { applySourceTransforms } = require('./sourceTransforms')

module.exports = {
  // generating the kernel
  generateKernel,
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
