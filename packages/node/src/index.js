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
    writeAutoConfig,
    writeAutoConfigDebug,
    writeAutoConfigAndRun,
    configPath,
    configDebugPath,
    configOverridePath,
    debugMode
  } = parseArgs()
  const cwd = process.cwd()
  const entryId = path.resolve(cwd, entryPath)

  const shouldParseApplication = writeAutoConfig || writeAutoConfigDebug || writeAutoConfigAndRun
  const shouldRunApplication = (!writeAutoConfig && !writeAutoConfigDebug) || writeAutoConfigAndRun

  if (shouldParseApplication) {
    // parse mode
    const includeDebugInfo = Boolean(writeAutoConfigDebug)
    const { resolutions } = await loadPolicy({ debugMode, configPath, configOverridePath })
    console.log(`LavaMoat generating config from entry "${entryId}"...`)
    const config = await parseForConfig({ cwd, entryId, resolutions, includeDebugInfo })
    // write config debug file
    if (includeDebugInfo) {
      const serializedConfig = jsonStringify(config, { space: 2 })
      fs.writeFileSync(configDebugPath, serializedConfig)
      console.log(`LavaMoat wrote config debug to "${configDebugPath}"`)
    }
    // write config file
    delete config.debugInfo
    const serializedConfig = jsonStringify(config, { space: 2 })
    fs.writeFileSync(configPath, serializedConfig)
    console.log(`LavaMoat wrote config to "${configPath}"`)
  }
  if (shouldRunApplication) {
    // execution mode
    const lavamoatConfig = await loadPolicy({ debugMode, configPath, configOverridePath })
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
      // the path for the config file
      yargs.option('config', {
        alias: 'configPath',
        describe: 'the path for the config file',
        type: 'string',
        default: defaultPaths.primary
      })
      // the path for the config override file
      yargs.option('configOverride', {
        alias: 'configOverridePath',
        describe: 'the path for the config override file',
        type: 'string',
        default: defaultPaths.override
      })
      // the path for the config debug file
      yargs.option('configDebug', {
        alias: 'configDebugPath',
        describe: 'the path for the config override file',
        type: 'string',
        default: defaultPaths.debug
      })
      // debugMode, disable some protections for easier debugging
      yargs.option('debugMode', {
        describe: 'debugMode, disable some protections for easier debugging',
        type: 'boolean',
        default: false
      })
      // parsing mode, write config to config path
      yargs.option('writeAutoConfig', {
        describe: 'parse the application from the entry file and generate a LavaMoat config file.',
        type: 'boolean',
        default: false
      })
      // parsing + run mode, write config to config path then execute with new config
      yargs.option('writeAutoConfigAndRun', {
        describe: 'parse + generate a LavaMoat config file then execute with the new config.',
        type: 'boolean',
        default: false
      })
      // parsing mode, write config debug info to specified or default path
      yargs.option('writeAutoConfigDebug', {
        describe: 'when writeAutoConfig is enabled, write config debug info to specified or default path',
        type: 'boolean',
        default: false
      })
    })
    .help()

  const parsedArgs = argsParser.parse()
  // resolve paths
  parsedArgs.configPath = path.resolve(parsedArgs.configPath)
  parsedArgs.configOverridePath = path.resolve(parsedArgs.configOverridePath)
  parsedArgs.configDebugPath = path.resolve(parsedArgs.configDebugPath)

  return parsedArgs
}

async function loadPolicy ({ debugMode, configPath, configOverridePath }) {
  let config = { resources: {} }
  // try config
  if (fs.existsSync(configPath)) {
    if (debugMode) console.warn(`Lavamoat looking for config at ${configPath}`)
    const configSource = fs.readFileSync(configPath, 'utf8')
    config = JSON.parse(configSource)
  } else {
    if (debugMode) console.warn('Lavamoat could not find config')
  }
  // try config override
  if (fs.existsSync(configOverridePath)) {
    if (debugMode) console.warn(`Lavamoat looking for override config at ${configOverridePath}`)
    const configSource = fs.readFileSync(configOverridePath, 'utf8')
    const overrideConfig = JSON.parse(configSource)
    config = mergeConfig(config, overrideConfig)
  } else {
    if (debugMode) console.warn('Lavamoat could not find config override')
  }
  return config
}
