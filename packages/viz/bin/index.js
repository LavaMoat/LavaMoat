#!/usr/bin/env node
/* eslint-env node */
/* eslint-disable import/unambiguous */

const { promises: fs } = require('fs')
const path = require('path')
const yargs = require('yargs')
const { ncp } = require('ncp')
const pify = require('pify')
const openUrl = require('open')
const { mergeConfig } = require('lavamoat-core')

main().catch((err) => console.error(err))

function parseArgs () {
  const argsParser = yargs
    .usage('$0', 'generate topological visualization for dep graph', () => {
      // path to write viz output
      yargs.option('dest', {
        describe: 'path to write viz output',
        type: 'string',
        default: './viz/'
      })
      // the path for the debug-config file
      yargs.option('debugConfig', {
        describe: 'the path for the debug-config file',
        type: 'string',
        default: './lavamoat-config-debug.json'
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
      // open the output dir
      yargs.option('open', {
        describe: 'open the visualization',
        type: 'boolean',
        default: false
      })
    })
    .help()

  const parsedArgs = argsParser.parse()
  return parsedArgs
}

async function main () {
  const { debugConfig, config, configOverride, dest, open } = parseArgs()
  const fullDest = path.resolve(dest)
  const source = path.join(__dirname, '/../dist/')
  // copy app dir
  await fs.mkdir(fullDest, { recursive: true })
  await pify((cb) => ncp(source, fullDest, cb))()
  // add data-injection file
  const debugConfigContent = await fs.readFile(debugConfig, 'utf8')
  const configContent = await fs.readFile(config, 'utf8')
  const configOverrideContent = await fs.readFile(configOverride, 'utf8')
  const finalConfigString = JSON.stringify(mergeConfig(JSON.parse(configContent), JSON.parse(configOverrideContent)))
  const dataInjectionContent = `globalThis.CONFIG_DEBUG = ${debugConfigContent}; globalThis.CONFIG = ${configContent}; globalThis.CONFIG_OVERRIDE = ${configOverrideContent}; globalThis.CONFIG_FINAL = ${finalConfigString};`

  await fs.writeFile(`${fullDest}/injectConfigDebugData.js`, dataInjectionContent)
  if (open) {
    openUrl(`file:///${fullDest}/index.html`)
  }
  console.log(`generated viz in "${dest}"`)
}
