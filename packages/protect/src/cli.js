#!/usr/bin/env node

//@ts-check

const yargs = require('yargs')

const { protectProject, SUPPORTED_PKG_MANAGERS } = require('./index.js')

async function parseArgs () {
  const argsParser = yargs
    .usage('Usage: $0 <command> [options]')
    .command('project', 'set up project-level protections', (project_) => {
      project_.option('interactive', {
        alias: 'i',
        describe: 'prompt for protections and parameters',
        type: 'boolean',
        default: false,
      }),
      project_.option('dry-run', {
        alias: 'n',
        describe: 'output actions; don\'t actually perform changes',
        type: 'boolean',
        default: false,
      })
      project_.option('setup-scripts', {
        // TODO: better description
        describe: 'set up preinstall lifecycle hook',
        type: 'boolean',
        default: false,
      })
      project_.option('setup-node', {
        // TODO: better description
        describe: 'set up lavamoat-node for runtime protection',
        type: 'boolean',
        default: false,
      })
      project_.option('package-manager', {
        alias: 'p',
        describe: 'package manager to configure',
        choices: SUPPORTED_PKG_MANAGERS,
        requiresArg: false,
      })
      project_.option('force', {
        alias: 'f',
        describe: 'overwrite existing files without prompting',
        type: 'boolean',
        default: false,
      })
    }, async (argv) => {
      await protectProject(argv)
    })
    .demandCommand(1, 1)
    .help()
    .strict()

  await argsParser.parse(process.argv.slice(2))
}

async function main () {
  await parseArgs()
}

main().catch((err) => console.error(err))
