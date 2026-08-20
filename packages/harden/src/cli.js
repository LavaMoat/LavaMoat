#!/usr/bin/env node

import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { hardenDefaults } from './index.js'
/** @import {Level} from './tools/types.js' */
/** @import {DecisionsForOpinions} from './tools/types.js' */
import { createFallbackDecisions } from './tools/default-decisions.js'
import { createWizard, wizardPrint } from './tools/wizard.js'
import { print } from './tools/print.js'
import { createVerifier } from './tools/verifier.js'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean', short: 'v' },
    json: { type: 'boolean' },
    'package-manager': { type: 'string', short: 'p' },
    level: { type: 'string', short: 'l' },
    'decisions-snapshot': { type: 'string', short: 'd' },
    'save-decisions': { type: 'boolean', short: 's' },
  },
})

if (values.help) {
  print(`Usage: harden <command> [options]

Commands:
  defaults    Generate hardened config with reasonable defaults
    Options:
      -p, --package-manager <pm>  Package manager (npm, yarn, pnpm)
      -l, --level <level>         Hardening level (baseline, moderate, strict) [default: moderate]
      -d, --decisions-snapshot <file>  Path to decisions snapshot file (JSON) to apply regardless of level set
     

  wizard      Interactive wizard to generate hardened config
    Options:
      -p, --package-manager <pm>  Package manager (npm, yarn, pnpm)
      -d, --decisions-snapshot <file>  Path to decisions snapshot file (JSON) to pre-fill wizard

  check       Check current config against a hardening level (exit 1 if not satisfied)
    Options:
      -p, --package-manager <pm>  Package manager (npm, yarn, pnpm)
      -l, --level <level>         Hardening level (baseline, moderate, strict) [default: moderate]
      --json                       Output machine-readable JSON to stdout (check only)

Options
  -h, --help                  Show this help
  -v, --version               Show version
  -s, --save-decisions        Save decisions snapshot to ./decisions-snapshot.json at the end of the run
      `)
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
let decisions
let customPrint = print
/** @type {DecisionsForOpinions | undefined} */
let decisionsSnapshot

/** @type {((decisions: DecisionsForOpinions) => Promise<void>) | undefined} */
const saveDecisions = values['save-decisions']
  ? async (snapshot) => {
      const outputPath = resolve('decisions-snapshot.json')
      await writeFile(
        outputPath,
        `${JSON.stringify(snapshot, null, 2)}\n`,
        'utf8'
      )
      print(`Saved decisions snapshot to ${outputPath}`)
    }
  : undefined

const level = /** @type {Level} */ (values.level ?? 'moderate')
if (!['baseline', 'moderate', 'strict'].includes(level)) {
  print(`Error: Invalid level "${level}". Use baseline, moderate, or strict.`)
  process.exit(1)
}

if (values['decisions-snapshot']) {
  const snapshotPath = resolve(values['decisions-snapshot'])
  try {
    print(`Loading decisions from ${snapshotPath}`)
    const fileContent = await readFile(snapshotPath, 'utf8')
    decisionsSnapshot = JSON.parse(fileContent)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    print(
      `[LavaMoat] Error: Could not load decisions snapshot from "${snapshotPath}".\n` +
        `Make sure the file exists and contains valid JSON.\n` +
        `Details: ${message}`
    )
    process.exit(1)
  }
}

switch (command) {
  case 'defaults':
    {
      decisions = createFallbackDecisions({
        level,
        print,
        packageManager: values['package-manager'],
        decisionsSnapshot,
        saveDecisions,
      })
    }
    break
  case 'wizard':
    {
      decisions = createWizard({
        packageManager: values['package-manager'],
        decisionsSnapshot,
        saveDecisions,
      })
      customPrint = wizardPrint
    }
    break
  case 'check':
    {
      decisions = createVerifier({
        level,
        print,
        packageManager: values['package-manager'],
        json: values.json === true,
      })
    }
    break
  default:
    print(
      `Unknown command: ${command ?? '(none)'}. Run "harden --help" for usage.`
    )
    process.exit(1)
}

try {
  const { summary } = await hardenDefaults({
    cwd: resolve('.'),
    packageManager: values['package-manager'] || undefined,
    decisions,
    print: customPrint,
  })

  const { exitCode } = await decisions.showSummary(summary)

  process.exitCode = exitCode
} catch (err) {
  print(err)
  process.exit(1)
}
