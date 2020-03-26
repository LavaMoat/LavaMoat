#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const { generateKernel } = require('lavamoat-core')
const { parseForConfig } = require('./parseForConfig')

runLava().catch(console.error)

async function runLava () {
  const { entryPath, writeAutoConfig } = parseArgs()
  const entryDir = process.cwd()
  const entryId = path.resolve(entryDir, entryPath)
  if (writeAutoConfig) {
    // parse mode
    console.log(`LavaMoat generating config for "${entryId}"...`)
    const parseResult = await parseForConfig({ entryId })
    console.log('done parsing', parseResult)
  } else {
    // execution mode
    const kernel = createKernel()
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
        describe: 'config',
        type: 'string',
        default: './lavamoat-config.json',
      })
      // the path for the config override file
      yargs.option('configOverride', {
        describe: 'configOverride',
        type: 'string',
        default: './lavamoat-config-override.json',
      })
      // debugMode, disable some protections for easier debugging
      yargs.option('debugMode', {
        describe: 'debugMode',
        type: 'boolean',
        default: false,
      })
      // parsing mode, write config to config path
      yargs.option('writeAutoConfig', {
        describe: 'parse the application from the entry file and generate a LavaMoat config file.',
        type: 'boolean',
        default: false,
      })
      // parsing mode, write config debug info to specified or default path
      yargs.option('writeAutoConfigDebug', {
        describe: 'writeAutoConfigDebug',
        type: 'string',
        // default: './lavamoat-config-debug.json',
        default: undefined,
      })

    })
    .help()

  const parsedArgs = argsParser.parse()
  return parsedArgs
}

function createKernel () {
  const lavamoatConfig = {}
  const createKernel = eval(generateKernel())
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
  })
  return kernel
}

function loadModuleData (absolutePath) {
  console.log('loadModuleData', absolutePath)
  const moduleContent = fs.readFileSync(absolutePath)
  const wrappedContent = `(function(require,module,exports){${moduleContent}})`
  const packageData = packageDataForModule({ file: absolutePath })
  const packageName = packageData.packageName || '<root>'

  return {
    file: absolutePath,
    package: packageName,
    source: wrappedContent,
    sourceString: wrappedContent,
  }
}

function getRelativeModuleId (parentAbsolutePath, relativePath) {
  const parentDir = path.parse(parentAbsolutePath).dir
  const fullPath = path.resolve(parentDir, relativePath)
  const resolved = require.resolve(fullPath)
  return resolved
}