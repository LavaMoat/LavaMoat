#!/usr/bin/env node
const { parseArgs } = require('node:util')
const { runAllValidations } = require('./index')
const { readFileSync } = require('node:fs')
const path = require('node:path')

const options = {
  projectRoot: {
    type: 'string',
    default: process.cwd(),
  },
  type: {
    type: 'string',
  },
  ignore: {
    type: 'string',
  },
  help: {
    type: 'boolean',
  },
}
const {
  values: { type, ignore, help, projectRoot },
} = parseArgs({ options })

if (help) {
  console.error(
    'Usage: git-safe-dependencies [--type=yarn|npm] [--ignore=file.json] [--projectRoot=path]'
  )
  process.exit(2)
}
const cwd = path.resolve(projectRoot)

console.error(`[lockfile-lint] Validating: package.json and lockfile at ${cwd}`)
runAllValidations({ cwd, type })
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
            ` ${e.package}:
  [${e.validator}] ${e.message}    // problem id: ${e.id}
`
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
