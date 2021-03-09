#!/usr/bin/env node
/* eslint-disable no-eval */

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const jsonStringify = require('json-stable-stringify')
const { mergeConfig, getDefaultPaths } = require('lavamoat-core')
const { parseForConfig } = require('./parseForConfig')
const { createKernel } = require('./kernel')

runLava().catch(err => {
  console.error(err)
  process.exit(1)
})

async function runLava () {
  const {
    entryPath,
    writeAutoPolicy,
    writeAutoPolicyDebug,
    writeAutoPolicyAndRun,
    policyPath,
    policyDebugPath,
    policyOverridePath,
    debugMode
  } = parseArgs()
  const cwd = process.cwd()
  const entryId = path.resolve(cwd, entryPath)

  const shouldParseApplication = writeAutoPolicy || writeAutoPolicyDebug || writeAutoPolicyAndRun
  const shouldRunApplication = (!writeAutoPolicy && !writeAutoPolicyDebug) || writeAutoPolicyAndRun

  if (shouldParseApplication) {
    // parse mode
    const includeDebugInfo = Boolean(writeAutoPolicyDebug)
    const { resolutions } = await loadPolicy({ debugMode, policyPath, policyOverridePath })
    console.warn(`LavaMoat generating policy from entry "${entryId}"...`)
    const policy = await parseForConfig({ cwd, entryId, resolutions, includeDebugInfo })
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
    const lavamoatConfig = await loadPolicy({ debugMode, policyPath, policyOverridePath })
    const kernel = createKernel({ cwd, lavamoatConfig, debugMode })
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
      // debugMode, disable some protections for easier debugging
      yargs.option('debugMode', {
        alias: ['d', 'debug'],
        describe: 'Disable some protections and extra logging for easier debugging.',
        type: 'boolean',
        default: false
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
    })
    .help()

  const parsedArgs = argsParser.parse()
  // resolve paths
  parsedArgs.policyPath = path.resolve(parsedArgs.policyPath)
  parsedArgs.policyOverridePath = path.resolve(parsedArgs.policyOverridePath)
  parsedArgs.policyDebugPath = path.resolve(parsedArgs.policyDebugPath)

  return parsedArgs
}

async function loadPolicy ({ debugMode, policyPath, policyOverridePath }) {
  let policy = { resources: {} }
  // try policy
  if (fs.existsSync(policyPath)) {
    if (debugMode) console.warn(`Lavamoat looking for policy at ${policyPath}`)
    const configSource = fs.readFileSync(policyPath, 'utf8')
    policy = JSON.parse(configSource)
  } else {
    if (debugMode) console.warn('Lavamoat could not find policy')
  }
  // try policy override
  if (fs.existsSync(policyOverridePath)) {
    if (debugMode) console.warn(`Lavamoat looking for override policy at ${policyOverridePath}`)
    const configSource = fs.readFileSync(policyOverridePath, 'utf8')
    const overrideConfig = JSON.parse(configSource)
    policy = mergeConfig(policy, overrideConfig)
  } else {
    if (debugMode) console.warn('Lavamoat could not find policy override')
  }
  return policy
}
