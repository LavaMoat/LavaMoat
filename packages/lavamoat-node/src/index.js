/* eslint-disable no-eval */

const path = require('node:path')
const fs = require('node:fs')
const {
  loadPolicy,
  loadPolicyAndApplyOverrides,
  jsonStringifySortedPolicy,
} = require('lavamoat-core')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const { parseForPolicy } = require('./parseForPolicy')
const { createKernel } = require('./kernel')

const defaults = require('./defaults')

async function runLava(options) {
  options = Object.assign({}, defaults, options)

  options.projectRoot = path.resolve(options.projectRoot)
  options.entryPath = path.resolve(options.projectRoot, options.entryPath)
  options.policyPath = path.resolve(options.projectRoot, options.policyPath)
  options.policyOverridePath = path.resolve(
    options.projectRoot,
    options.policyOverridePath
  )
  options.policyDebugPath = path.resolve(
    options.projectRoot,
    options.policyDebugPath
  )

  const {
    entryPath: entryId,
    writeAutoPolicy,
    writeAutoPolicyDebug,
    writeAutoPolicyAndRun,
    policyPath,
    policyDebugPath,
    policyOverridePath,
    projectRoot,
    scuttleGlobalThis,
    debugMode,
    statsMode,
  } = options
  const shouldParseApplication =
    writeAutoPolicy || writeAutoPolicyDebug || writeAutoPolicyAndRun
  const shouldRunApplication =
    (!writeAutoPolicy && !writeAutoPolicyDebug) || writeAutoPolicyAndRun

  if (shouldParseApplication) {
    // parse mode
    const includeDebugInfo = Boolean(writeAutoPolicyDebug)
    const policyOverride = await loadPolicy({
      debugMode,
      policyPath: policyOverridePath,
    })
    console.warn(`LavaMoat generating policy from entry "${entryId}"...`)
    const policy = await parseForPolicy({
      projectRoot,
      entryId,
      policyOverride,
      includeDebugInfo,
    })
    // write policy debug file
    if (includeDebugInfo) {
      fs.mkdirSync(path.dirname(policyDebugPath), { recursive: true })
      fs.writeFileSync(policyDebugPath, jsonStringifySortedPolicy(policy))
      console.warn(`LavaMoat wrote policy debug to "${policyDebugPath}"`)
    }
    // cleanup debug info
    delete policy.debugInfo
    // write policy file
    fs.mkdirSync(path.dirname(policyPath), { recursive: true })
    fs.writeFileSync(policyPath, jsonStringifySortedPolicy(policy))
    console.warn(`LavaMoat wrote policy to "${policyPath}"`)
  }
  if (shouldRunApplication) {
    // execution mode
    const lavamoatPolicy = await loadPolicyAndApplyOverrides({
      debugMode,
      policyPath,
      policyOverridePath,
    })
    const canonicalNameMap = await loadCanonicalNameMap({
      rootDir: projectRoot,
      includeDevDeps: true,
    })
    const kernel = createKernel({
      projectRoot,
      lavamoatPolicy,
      canonicalNameMap,
      scuttleGlobalThis,
      debugMode,
      statsMode,
    })

    // run entrypoint
    kernel.internalRequire(entryId)
  }
}

module.exports = { runLava }
