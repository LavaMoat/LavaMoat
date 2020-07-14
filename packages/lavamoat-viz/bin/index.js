#!/usr/bin/env node

const { promises: fs } = require('fs')
const path = require('path')
const yargs = require('yargs')
const { ncp } = require('ncp')
const pify = require('pify')
const open = require('open')

const { config, deps, dest, serve } = parseArgs()

if (!dest) dest = 'viz/'
if (!deps) deps = './lavamoat/lavamoat-config-debug.json'
if (!config) config = './lavamoat/lavamoat-config.json'

const source = path.join(__dirname, '/../dist/')

main().catch(err => console.error(err))

function parseArgs() {
  const argsParser = yargs
    .command('lavamoat-viz [config] [debug config] [dest]', 'generate topological visualization for dep graph', (yargs) => {
      // the path for the config file
      yargs.option('config', {
        alias: 'configPath',
        describe: 'the path for the config file',
        type: 'string',
        default: './lavamoat/lavamoat-config.json'
      })
      // the path for the debug-config file
      yargs.option('deps', {
        describe: 'the path for the debug-config file',
        type: 'string',
        default: './lavamoat/lavamoat-config-debug.json'
      })
      // path to write viz output
      yargs.option('dest', {
        describe: 'path to write viz output',
        type: 'string',
        default: 'viz/'
      })
      //serve the output dir
      yargs.option('serve', {
        describe: 'serve the visualization',
        type: 'boolean'
      })
    })
    .help()

  const parsedArgs = argsParser.parse()
  console.log(parsedArgs)
  return parsedArgs
}

async function main () {
  console.log(`"${source}", "${dest}"`)
  // copy app dir
  await fs.mkdir(dest, { recursive: true })
  await pify(cb => ncp(source, dest, cb))()
  // add data-injection file
  const configContent = await fs.readFile(config, 'utf8')
  const depsContent = await fs.readFile(deps, 'utf8')
  const dataInjectionContent = `
  self.CONFIG = ${configContent};
  self.DEPS = ${depsContent};
  `
  await fs.writeFile(dest + '/data-injection.js', dataInjectionContent)
  if (serve) {
    open(`file:///${path.dirname(require.main.path)}/viz/index.html`)
  }
  console.log(`generated viz in ${dest}`)
}
