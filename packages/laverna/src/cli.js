#!/usr/bin/env node
/* eslint-disable no-restricted-globals */
/* eslint-disable n/shebang */
// @ts-check

const { bold, magenta, gray, italic } = require('kleur')
const util = require('node:util')
const { Laverna } = require('./laverna')
const { ERR } = require('./log-symbols')
const { name, bugs, version, description } = require('../package.json')

/**
 * CLI for `laverna`, which wraps `npm publish` to only attempt publishing
 * packages that have not yet been published.
 *
 * @packageDocumentation
 */

/**
 * Options for {@link util.parseArgs} config (`options` property).
 *
 * @satisfies {import('node:util').ParseArgsConfig['options']}
 */
const options = /**
 * @type {const}
 */ ({
  dryRun: {
    type: 'boolean',
  },
  'dry-run': {
    type: 'boolean',
  },
  root: {
    type: 'string',
  },
  help: {
    type: 'boolean',
  },
  newPkg: {
    type: 'string',
    multiple: true,
  },
  'new-pkg': {
    type: 'string',
    multiple: true,
  },
  yes: {
    type: 'boolean',
    short: 'y',
  },
})

/**
 * Parses CLI args
 *
 * @param {string[]} [args]
 */
function parseArgs(args) {
  const { values } = util.parseArgs({
    args,
    options,
  })
  return values
}

function main() {
  let opts = parseArgs()

  if (opts.help) {
    // this should be the only place we write to stdout unless we
    // want to start outputting JSON
    console.log(`
  ${bold('laverna')} [options..]

  ${italic(description)}

  Options:

  --dryRun        - Enable dry-run mode
  --root=<path>   - Path to workspace root (default: current working dir)
  --newPkg=<name> - Workspace <name> has never been published (repeatable)
  --yes/-y        - Skip confirmation prompt

  Problems? Visit ${bugs.url}

  `)
  } else {
    // refuse to run with both camelCase and kebab-case flags
    if ((opts.dryRun && opts['dry-run']) || (opts.newPkg && opts['new-pkg'])) {
      console.error(ERR, 'Use camelCase or kebab-case flags; not both')
      process.exitCode = 1
      return
    }

    // prefer camelCase
    opts.dryRun = opts.dryRun ?? opts['dry-run']
    opts.newPkg = opts.newPkg ?? opts['new-pkg']

    console.error(`📦 ${bold(magenta(name)) + gray('@') + magenta(version)}\n`)
    const laverna = new Laverna(opts)
    laverna.publishWorkspaces().catch((err) => {
      console.error(ERR, err?.message ?? err)
      process.exitCode = 1
    })
  }
}

if (require.main === module) {
  main()
}
