#!/usr/bin/env node
const path = require('node:path')
const { parseArgs } = require('node:util')
const { validateLockfile } = require('./lockfile-lint')
const { readFileSync } = require('node:fs')
const options = {
  type: {
    type: 'string',
  },
  ignore: {
    type: 'string',
  },
}
const {
  values: { type, ignore },
  positionals,
} = parseArgs({ options, allowPositionals: true })

if (!positionals || positionals.length !== 1) {
  console.error(
    'Usage: lockfile-lint <lockfile> [--type=yarn|npm] [--ignore=file.json]'
  )
  process.exit(2)
}

const lockfilePath = path.resolve(process.argv[2])

console.error(`[lockfile-lint] Validating: ${lockfilePath}`)
validateLockfile({ lockfilePath, type })
  .then((errors) => {
    if (ignore) {
      const ignores = JSON.parse(readFileSync(ignore, 'utf8'))
      if (!Array.isArray(ignores)) {
        console.error(`[lockfile-lint] ignore file must be an array`)
        process.exit(2)
      }
      errors = errors.filter((e) => {
        if (ignores.includes(e.id)) {
          console.error(`[lockfile-lint] Ignoring: ${e.validator} ${e.id}`)
          return false
        }
        return true
      })
    }
    if (errors.length === 0) {
      console.error(`[lockfile-lint] Validation successful`)
      return
    }
    console.error(`[lockfile-lint] Validation failed:`)
    console.error(
      errors
        .map(
          (e) =>
            ` ${e.package}: [${e.validator}] ${e.message}    // problem id: ${e.id}`
        )
        .sort()
        .join('\n')
    )
    process.exit(1)
  })
  .catch((error) => {
    console.error('[lockfile-lint] An error occurred during validation:', error)
    process.exit(2)
  })
