#!/usr/bin/env node
/* eslint-disable no-eval */

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const mergeDeep = require('merge-deep')
const resolve = require('resolve')
const { sanitize } = require('htmlescape')
const { generateKernel, packageDataForModule } = require('lavamoat-core')
const { parseForConfig } = require('./parseForConfig')

runLava().catch(console.error)

async function runLava () {
  const {
    entryPath,
    writeAutoConfig,
    writeAutoConfigAndRun,
    configPath,
    configOverridePath,
    debugMode
  } = parseArgs()
  const entryDir = process.cwd()
  const entryId = path.resolve(entryDir, entryPath)

  const shouldParseApplication = writeAutoConfig || writeAutoConfigAndRun
  const shouldRunApplication = !writeAutoConfig || writeAutoConfigAndRun

  if (shouldParseApplication) {
    // parse mode
    console.log(`LavaMoat generating config for "${entryId}"...`)
    const serializedConfig = await parseForConfig({ entryId })
    fs.writeFileSync(configPath, serializedConfig)
    console.log(`LavaMoat wrote config to "${configPath}"`)
  }
  if (shouldRunApplication) {
    // execution mode
    const lavamoatConfig = await loadConfig({ configPath, configOverridePath })
    const kernel = createKernel({ lavamoatConfig, debugMode })
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
  return parsedArgs
}

function createKernel ({ lavamoatConfig, debugMode }) {
  const createKernel = eval(generateKernel({ debugMode }))
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId
  })
  return kernel
}

function loadModuleData (absolutePath) {
  if (resolve.isCore(absolutePath)) {
    // for core modules (eg "fs")
    return {
      file: absolutePath,
      package: absolutePath,
      // wrapper around unprotected "require"
      moduleInitializer: (_, module) => {
        module.exports = require(absolutePath)
      }
    }
  } else {
    // load normal user-space module
    const moduleContent = fs.readFileSync(absolutePath, 'utf8')
    // apply source transforms
    let transformedContent = moduleContent
      // html comment
      .split('-->').join('-- >')
      // use indirect eval
      .split(' eval(').join(' (eval)(')
    // wrap json modules (borrowed from browserify)
    if (/\.json$/.test(absolutePath)) {
      const sanitizedString = sanitize(transformedContent)
      try {
        // check json validity
        JSON.parse(sanitizedString)
        transformedContent = 'module.exports=' + sanitizedString
      } catch (err) {
        err.message = `While parsing ${absolutePath}: ${err.message}`
        throw err
      }
    }
    // wrap in moduleInitializer
    const wrappedContent = `(function(require,module,exports){${transformedContent}})`
    const packageData = packageDataForModule({ file: absolutePath })
    const packageName = packageData.packageName || '<root>'
    return {
      file: absolutePath,
      package: packageName,
      source: wrappedContent,
      sourceString: wrappedContent
    }
  }
}

function getRelativeModuleId (parentAbsolutePath, relativePath) {
  const parentDir = path.parse(parentAbsolutePath).dir
  const resolved = resolve.sync(relativePath, { basedir: parentDir })
  return resolved
}

async function loadConfig ({ configPath, configOverridePath }) {
  let config = { resources: {} }
  // try config
  if (fs.existsSync(configPath)) {
    const configSource = fs.readFileSync(configPath, 'utf8')
    config = JSON.parse(configSource)
  }
  // try config override
  if (fs.existsSync(configOverridePath)) {
    const configSource = fs.readFileSync(configOverridePath, 'utf8')
    const overrideConfig = JSON.parse(configSource)
    config = mergeDeep(config, overrideConfig)
  }
  return config
}
