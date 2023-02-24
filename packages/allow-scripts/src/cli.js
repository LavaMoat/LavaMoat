#!/usr/bin/env node

const yargs = require('yargs')
const { runAllowedPackages, setDefaultConfiguration, printPackagesList } = require('./index.js')
const { writeRcFile, editPackageJson } = require('./setup.js')
const { FEATURE } = require('./toggles') 

start().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function start () {
  const rootDir = process.cwd()

  const parsedArgs = parseArgs()
  const command = parsedArgs.command || 'run'
  FEATURE.bins = parsedArgs.experimentalBins

  switch (command) {
    // (default) run scripts
    case 'run': {
      await runAllowedPackages({ rootDir })
      return
    }
    // automatically set configuration
    case 'auto': {
      await setDefaultConfiguration({ rootDir })
      return
    }
    // list packages
    case 'list': {
      await printPackagesList({ rootDir })
      return
    }
    case 'setup': {
      writeRcFile()
      editPackageJson()
      return
    }
    // (error) unrecognized
    default: {
      throw new Error(`@lavamoat/allow-scripts - unknown command "${parsedArgs.command}"`)
    }
  }
}

function parseArgs () {
  const argsParser = yargs
    .usage('Usage: $0 <command> [options]')
    .command('$0', 'run the allowed scripts')
    .command('run', 'run the allowed scripts')
    .command('auto', 'generate scripts policy in package.json')
    .command('setup', 'configure local repository to use allow-scripts')
    .option('experimental-bins', {
      alias: 'bin',
      describe: 'opt-in to set up experimental protection against bin script confusion',
      type: 'boolean',
      default: false,
    })
    .help()

  const parsedArgs = argsParser.parse()
  parsedArgs.command = parsedArgs._[0]

  return parsedArgs
}
