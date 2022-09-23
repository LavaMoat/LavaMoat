#!/usr/bin/env node
/* eslint-disable no-eval */

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const jsonStringify = require('json-stable-stringify')
const { loadPolicy, loadPolicyAndApplyOverrides, getDefaultPaths } = require('lavamoat-core')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const { parseForPolicy } = require('./parseForPolicy')
const { createKernel } = require('./kernel')
const yargsFlags = require('./yargsFlags')

runLava().catch(err => {
  // explicity log stack to workaround https://github.com/endojs/endo/issues/944
  console.error(err.stack || err)
  process.exit(1)
})

async function runLava () {
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
    scuttleGlobalThisExceptions,
    debugMode,
    statsMode,
  } = parseArgs()
  const shouldParseApplication = writeAutoPolicy || writeAutoPolicyDebug || writeAutoPolicyAndRun
  const shouldRunApplication = (!writeAutoPolicy && !writeAutoPolicyDebug) || writeAutoPolicyAndRun

  if (shouldParseApplication) {
    // parse mode
    const includeDebugInfo = Boolean(writeAutoPolicyDebug)
    const policyOverride = await loadPolicy({ debugMode, policyPath: policyOverridePath })
    console.warn(`LavaMoat generating policy from entry "${entryId}"...`)
    const policy = await parseForPolicy({ projectRoot, entryId, policyOverride, includeDebugInfo })
    // write policy debug file
    if (includeDebugInfo) {
      fs.mkdirSync(path.dirname(policyDebugPath), { recursive: true })
      fs.writeFileSync(policyDebugPath, jsonStringify(policy, { space: 2 }))
      console.warn(`LavaMoat wrote policy debug to "${policyDebugPath}"`)
    }
    // cleanup debug info
    delete policy.debugInfo
    // write policy file
    fs.mkdirSync(path.dirname(policyPath), { recursive: true })
    fs.writeFileSync(policyPath, jsonStringify(policy, { space: 2 }))
    console.warn(`LavaMoat wrote policy to "${policyPath}"`)
  }
  if (shouldRunApplication) {
    // execution mode
    const lavamoatPolicy = await loadPolicyAndApplyOverrides({ debugMode, policyPath, policyOverridePath })
    const canonicalNameMap = await loadCanonicalNameMap({ rootDir: projectRoot, includeDevDeps: true })
    const kernel = createKernel({
      projectRoot,
      lavamoatPolicy,
      canonicalNameMap,
      scuttleGlobalThis,
      scuttleGlobalThisExceptions,
      debugMode,
      statsMode,
    })
    // patch process.argv so it matches the normal pattern
    // e.g. [runtime path, entrypoint, ...args]
    // we'll use the LavaMoat path as the runtime
    // so we just remove the node path
    process.argv.shift()
    // run entrypoint
    kernel.internalRequire(entryId)
  }
}

function parseArgs () {
  const defaultPaths = getDefaultPaths('node')
  const argsParser = yargs
    .usage('$0 <entryPath>', 'start the application', (yargs) => {
      // the entry file to run (or parse)
      yargs.positional('entryPath', {
        describe: 'the path to the entry file for your application. same as node.js',
        type: 'string'
      })
      yargsFlags(yargs, defaultPaths)
    })
    .help()

  const parsedArgs = argsParser.parse()
  // resolve paths
  parsedArgs.entryPath = path.resolve(parsedArgs.entryPath)
  parsedArgs.policyPath = path.resolve(parsedArgs.policyPath)
  parsedArgs.policyOverridePath = path.resolve(parsedArgs.policyOverridePath)
  parsedArgs.policyDebugPath = path.resolve(parsedArgs.policyDebugPath)
  parsedArgs.projectRoot = path.resolve(parsedArgs.projectRoot)

  return parsedArgs
}
