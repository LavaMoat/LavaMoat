#!/usr/bin/env node
// @ts-check
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { hardenDefaults } from './index.js'
import { createFallbackDecisions } from './tools/fallback-decisions.js'
import {
  printError,
  printHelp,
  printSummary,
  printVersion,
} from './tools/print.js'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    'package-manager': { type: 'string', short: 'p' },
    level: { type: 'string', short: 'l' },
  },
})

if (values.help) {
  printHelp(`Usage: harden <command> [options]

Commands:
  defaults    Generate hardened config with reasonable defaults

Options:
  -p, --package-manager <pm>  Package manager (npm, yarn, pnpm)
  -l, --level <level>         Hardening level (baseline, moderate, strict) [default: moderate]
  -h, --help                  Show this help
  -v, --version               Show version`)
  process.exit(0)
}

if (values.version) {
  const pkg = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  printVersion(pkg.version)
  process.exit(0)
}

const command = positionals[0]

if (command === 'defaults') {
  const level = /** @type {import('./index.js').Level} */ (
    values.level ?? 'moderate'
  )
  if (!['baseline', 'moderate', 'strict'].includes(level)) {
    printError(
      `Error: Invalid level "${level}". Use baseline, moderate, or strict.`
    )
    process.exit(1)
  }

  try {
    const { summary } = await hardenDefaults({
      cwd: resolve('.'),
      packageManager: values['package-manager'] || undefined,
      decisions: createFallbackDecisions(level),
    })

    printSummary(summary)
  } catch (err) {
    printError(err)
    process.exit(1)
  }
} else {
  printError(
    `Unknown command: ${command ?? '(none)'}. Run "harden --help" for usage.`
  )
  process.exit(1)
}
