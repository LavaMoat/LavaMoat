#!/usr/bin/env node
const { parseArgs } = require('node:util')
const { filterIgnores } = require('./ignore')
const path = require('node:path')

const { validateWorkflows } = require('./workflow')

const options = {
  workflows: {
    type: 'string',
    default: path.join(process.cwd(), '.github'),
  },
  ignore: {
    type: 'string',
  },
  help: {
    type: 'boolean',
  },
}
const {
  values: { ignore, help, workflows },
} = parseArgs({ options })

if (help) {
  console.error(
    'Usage: git-safe-actions [--ignore=file.json] [--workflows=path]'
  )
  process.exit(2)
}

console.error(`[git-safe] Validating workflows at ${workflows}`)
validateWorkflows(workflows)
  .then(({ errors, info }) => {
    console.error(`[git-safe] `, ...info)
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
            ` ${e.action}:
  in ${e.files.join(', ')}
  ${e.message}    // problem id: ${e.id}
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
