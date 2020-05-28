#!/usr/bin/env node
/* eslint-disable no-eval */

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const mergeDeep = require('merge-deep')
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
    writeAutoConfigAndRun,
    configPath,
    configOverridePath,
    debugMode
  } = parseArgs()
  const cwd = process.cwd()
  const entryId = path.resolve(cwd, entryPath)

  const shouldParseApplication = writeAutoConfig || writeAutoConfigAndRun
  const shouldRunApplication = !writeAutoConfig || writeAutoConfigAndRun

  if (shouldParseApplication) {
    // parse mode
    const { resolutions } = await loadConfig({ debugMode, configPath, configOverridePath })
    console.log(`LavaMoat generating config for "${entryId}"...`)
    const config = await parseForConfig({ cwd, entryId, resolutions })
    const serializedConfig = JSON.stringify(config, null, 2)
    fs.writeFileSync(configPath, serializedConfig)
    console.log(`LavaMoat wrote config to "${configPath}"`)
  }
  if (shouldRunApplication) {
    // execution mode
    const lavamoatConfig = await loadConfig({ debugMode, configPath, configOverridePath })
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
        default: './lavamoat-config.json'
      })
      // the path for the config override file
      yargs.option('configOverride', {
        alias: 'configOverridePath',
        describe: 'the path for the config override file',
        type: 'string',
        default: './lavamoat-config-override.json'
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
        type: 'string',
        // default: './lavamoat-config-debug.json',
        default: undefined
      })
    })
    .help()

  const parsedArgs = argsParser.parse()
  // resolve paths
  parsedArgs.configPath = path.resolve(parsedArgs.configPath)
  parsedArgs.configOverridePath = path.resolve(parsedArgs.configOverridePath)

  return parsedArgs
}

async function loadConfig ({ debugMode, configPath, configOverridePath }) {
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
    config = mergeDeep(config, overrideConfig)
  } else {
    if (debugMode) console.warn('Lavamoat could not find config override')
  }
  return config
}
