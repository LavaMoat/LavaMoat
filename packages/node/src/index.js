#!/usr/bin/env node
/* eslint-disable no-eval */

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const jsonStringify = require('json-stable-stringify')
const { loadPolicy, mergePolicy, getDefaultPaths } = require('lavamoat-core')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const { parseForPolicy } = require('./parseForPolicy')
const { createKernel } = require('./kernel')

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
    const policy = await loadPolicy({ debugMode, policyPath })
    let lavamoatPolicy = policy
    if (fs.existsSync(policyOverridePath)) {
      if (debugMode) console.warn(`Merging policy-override.json into policy.json`)
      const policyOverride = await loadPolicy({ debugMode, policyPath: policyOverridePath })
      lavamoatPolicy = mergePolicy(policy, policyOverride)
      // TODO: Only write if merge results in changes.
      // Would have to make a deep equal check on whole policy, which is a waste of time.
      // mergePolicy() should be able to do it in one pass.
      fs.writeFileSync(policyPath, jsonStringify(lavamoatPolicy, { space: 2 }))
    }
    const canonicalNameMap = await loadCanonicalNameMap({ rootDir: projectRoot, includeDevDeps: true })
    const kernel = createKernel({ projectRoot, lavamoatPolicy, canonicalNameMap, debugMode, statsMode })
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
      // the path for the policy file
      yargs.option('policy', {
        alias: ['p', 'policyPath'],
        describe: 'Pass in policy. Accepts a filepath string to the existing policy. When used in conjunction with --autopolicy, specifies where to write the policy. Default: ./lavamoat/node/policy.json',
        type: 'string',
        default: defaultPaths.primary
      })
      // the path for the policy override file
      yargs.option('policyOverride', {
        alias: ['o', 'override', 'policyOverridePath'],
        describe: 'Pass in override policy. Accepts a filepath string to the existing override policy. Default: ./lavamoat/node/policy-override.json',
        type: 'string',
        default: defaultPaths.override
      })
      // the path for the policy debug file
      yargs.option('policyDebug', {
        alias: ['pd', 'policydebug', 'policyDebugPath'],
        describe: 'Pass in debug policy. Accepts a filepath string to the existing debug policy. Default: ./lavamoat/node/policy-debug.json',
        type: 'string',
        default: defaultPaths.debug
      })
      // parsing mode, write policy to policy path
      yargs.option('writeAutoPolicy', {
        alias: ['a', 'autopolicy'],
        describe: 'Generate a "policy.json" and "policy-override.json" in the current working         directory. Overwrites any existing policy files. The override policy is for making manual policy changes and always takes precedence over the automatically generated policy.',
        type: 'boolean',
        default: false
      })
      // parsing + run mode, write policy to policy path then execute with new policy
      yargs.option('writeAutoPolicyAndRun', {
        alias: ['ar', 'autorun'],
        describe: 'parse + generate a LavaMoat policy file then execute with the new policy.',
        type: 'boolean',
        default: false
      })
      // parsing mode, write policy debug info to specified or default path
      yargs.option('writeAutoPolicyDebug', {
        alias: ['dp', 'debugpolicy'],
        describe: 'when writeAutoPolicy is enabled, write policy debug info to specified or default path',
        type: 'boolean',
        default: false
      })
      // parsing mode, write policy debug info to specified or default path
      yargs.option('projectRoot', {
        describe: 'specify the director from where packages should be resolved',
        type: 'string',
        default: process.cwd()
      })
      // debugMode, disable some protections for easier debugging
      yargs.option('debugMode', {
        alias: ['d', 'debug'],
        describe: 'Disable some protections and extra logging for easier debugging.',
        type: 'boolean',
        default: false
      })
      // log initialization stats
      yargs.option('statsMode', {
        alias: ['stats'],
        describe: 'enable writing and logging of stats',
        type: 'boolean',
        default: false
      })
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
