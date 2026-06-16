#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { readFile } from 'node:fs/promises'
import { hardenDefaults } from './index.js'
/** @import {Level} from "./tools/types.js" */
import { createFallbackDecisions } from './tools/fallback-decisions.js'
import { print } from './tools/print.js'

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
  print(`Usage: harden <command> [options]

Commands:
  defaults    Generate hardened config with reasonable defaults

Options:
  -p, --package-manager <pm>  Package manager (npm, yarn, pnpm)
  -l, --level <level>         Hardening level (baseline, moderate, paranoid) [default: moderate]
  -h, --help                  Show this help
  -v, --version               Show version`)
  process.exit(0)
}

if (values.version) {
  const pkg = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8')
  )
  print(pkg.version)
  process.exit(0)
}

const command = positionals[0]

if (command === 'defaults') {
  const level = /** @type {Level} */ (values.level ?? 'moderate')
  if (!['baseline', 'moderate', 'paranoid'].includes(level)) {
    print(
      `Error: Invalid level "${level}". Use baseline, moderate, or paranoid.`
    )
    process.exit(1)
  }

  try {
    const decisions = createFallbackDecisions({
      level,
      print,
      packageManager: values['package-manager'],
    })
    const { summary } = await hardenDefaults({
      cwd: resolve('.'),
      packageManager: values['package-manager'] || undefined,
      decisions,
      print,
    })

    print(summary)
  } catch (err) {
    print(err)
    process.exit(1)
  }
} else {
  print(
    `Unknown command: ${command ?? '(none)'}. Run "harden --help" for usage.`
  )
  process.exit(1)
}
