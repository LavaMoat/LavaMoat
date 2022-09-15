const {
  generateKernel
} = require('./generateKernel')
const { createModuleInspector, getDefaultPaths } = require('./generatePolicy')
const { parseForPolicy } = require('./parseForPolicy')
const { LavamoatModuleRecord } = require('./moduleRecord')
const { loadPolicy, loadPolicyAndApplyOverrides } = require('./loadPolicy')
const { mergePolicy } = require('./mergePolicy')
const { applySourceTransforms } = require('./sourceTransforms')
const { makeInitStatsHook } = require('./makeInitStatsHook')

module.exports = {
  // generating the kernel
  generateKernel,
  // generating lavamoat config
  createModuleInspector,
  parseForPolicy,
  loadPolicy,
  mergePolicy,
  loadPolicyAndApplyOverrides,
  getDefaultPaths,
  applySourceTransforms,
  // module record class
  LavamoatModuleRecord,
  // utils
  makeInitStatsHook,
}
