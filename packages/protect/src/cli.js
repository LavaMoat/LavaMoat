#!/usr/bin/env node

//@ts-check

const yargs = require('yargs')

const { detectPkgManager } = require('./lib/utils.js')
const { protectEnv, protectProject, SUPPORTED_PKG_MANAGERS } = require('./index.js')

async function parseArgs () {
  const argsParser = yargs
    .usage('Usage: $0 <command> [options]')
    .command('project', 'set up project-level protections', (project_) => {
      project_.option('interactive', {
        alias: 'i',
        describe: 'prompt for protections and parameters',
        type: 'boolean',
        default: false,
      })
      .option('dry-run', {
        alias: 'n',
        describe: 'output actions; don\'t actually perform changes',
        type: 'boolean',
        default: false,
      })
      .option('setup-scripts', {
        // TODO: better description
        describe: 'set up preinstall lifecycle hook',
        type: 'boolean',
        default: false,
      })
      .option('setup-node', {
        // TODO: better description
        describe: 'set up lavamoat-node for runtime protection',
        type: 'boolean',
        default: false,
      })
      // TODO: enforce only single
      .option('package-manager', {
        alias: 'p',
        describe: 'package manager to configure',
        choices: SUPPORTED_PKG_MANAGERS,
        requiresArg: false,
      })
      .option('force', {
        alias: 'f',
        describe: 'overwrite existing files without prompting',
        type: 'boolean',
        default: false,
      })
      .coerce('package-manager', pm =>
        pm ?? detectPkgManager()
      )
    }, async (argv) => {
      await protectProject(argv)
    })
    .command('env', 'set up host-level protections', (env_) => {
      env_.option('dry-run', {
        alias: 'n',
        describe: 'output actions; don\'t actually perform changes',
        type: 'boolean',
        default: false,
      })
      .option('package-manager', {
        alias: 'p',
        describe: 'package manager to configure',
        choices: SUPPORTED_PKG_MANAGERS,
        requiresArg: false,
      })
      .option('force', {
        alias: 'f',
        describe: 'overwrite existing files without prompting',
        type: 'boolean',
        default: false,
      })
    }, async (argv) => {
      await protectEnv(argv)
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
