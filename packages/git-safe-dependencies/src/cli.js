#!/usr/bin/env node
const { parseArgs } = require('node:util')
const { runAllValidations } = require('./index')
const { filterIgnores } = require('./ignore')
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

console.error(`[git-safe] Validating: package.json and lockfile at ${cwd}`)
runAllValidations({ cwd, type })
  .then((errors) => {
    if (ignore) {
      errors = filterIgnores(errors, ignore)
    }
    if (errors.length === 0) {
      console.error(`[git-safe] Validation successful`)
      return
    }
    console.error(`[git-safe] Validation failed:`)
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
    console.error('[git-safe] An error occurred during validation:', error)
    process.exit(2)
  })
