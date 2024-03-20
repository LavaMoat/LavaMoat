#!/usr/bin/env node
/* eslint-disable no-restricted-globals */
/* eslint-disable n/shebang */
// @ts-check

const { bold, magenta, gray, italic, cyan, underline } = require('kleur')
const util = require('node:util')
const { Laverna } = require('./index')
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
    default: [],
  },
  'new-pkg': {
    type: 'string',
    multiple: true,
    default: [],
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
  ${cyan(bold('laverna'))} ${cyan('[options..]')}

  "${description}"

  Options:

  ${bold('--dryRun')}        - Enable dry-run mode
  ${bold('--root=<path>')}   - Path to workspace root (default: current working dir)
  ${bold('--newPkg=<name>')} - Workspace <name> should be treated as a new package (repeatable)
  ${bold('--yes/-y')}        - Skip confirmation prompt (default: false; true ${italic('in CI')})

  Problems? Visit ${underline(bugs.url)}

  `)
  } else {
    // prefer camelCase
    opts.dryRun = opts.dryRun || opts['dry-run']
    opts.newPkg = [
      ...new Set([...(opts.newPkg ?? []), ...(opts['new-pkg'] ?? [])]),
    ]
    // must be true in CI; --yes=false is not a thing
    opts.yes = Boolean(process.env.CI) || opts.yes

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
