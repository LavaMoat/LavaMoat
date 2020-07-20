#!/usr/bin/env node

const { promises: fs } = require('fs')
const path = require('path')
const yargs = require('yargs')
const { ncp } = require('ncp')
const pify = require('pify')
const openUrl = require('open')

main().catch(err => console.error(err))

function parseArgs() {
  const argsParser = yargs
    .usage('$0', 'generate topological visualization for dep graph', (yargs) => {
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
      // open the output dir
      yargs.option('open', {
        describe: 'open the visualization',
        type: 'boolean',
        default: false,
      })
    })
    .help()

  const parsedArgs = argsParser.parse()
  return parsedArgs
}

async function main () {
  const { debugConfig, dest, open } = parseArgs()
  const fullDest = path.resolve(dest)
  const source = path.join(__dirname, '/../dist/')
  // copy app dir
  await fs.mkdir(fullDest, { recursive: true })
  await pify(cb => ncp(source, fullDest, cb))()
  // add data-injection file
  const configContent = await fs.readFile(debugConfig, 'utf8')
  const dataInjectionContent = `globalThis.CONFIG_DEBUG = ${configContent};`
  await fs.writeFile(fullDest + '/injectConfigDebugData.js', dataInjectionContent)
  if (open) {
    openUrl(`file:///${fullDest}/index.html`)
  }
  console.log(`generated viz in "${dest}"`)
}
