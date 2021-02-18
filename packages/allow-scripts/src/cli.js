#!/usr/bin/env node

const yargs = require('yargs')
const { runAllowedPackages, setDefaultConfiguration, printPackagesList } = require('./index.js')

start().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function start () {
  const rootDir = process.cwd()

  const parsedArgs = parseArgs()
  const command = parsedArgs.command || 'run'
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
    .command('list', 'list the packages and their allowlist status')
    .help()

  const parsedArgs = argsParser.parse()
  parsedArgs.command = parsedArgs._[0]
  // resolve paths
  // parsedArgs.configPath = path.resolve(parsedArgs.configPath)
  // parsedArgs.configOverridePath = path.resolve(parsedArgs.configOverridePath)
  // parsedArgs.configDebugPath = path.resolve(parsedArgs.configDebugPath)

  return parsedArgs
}
