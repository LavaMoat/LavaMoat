# @lavamoat/vog

> CLI utilities for [LavaMoat][]

## Motivation

We want a simple package we can use across LavaMoat CLI tools for common CLI needs.

This package is mostly a thin wrapper around a few CLI libraries:

- [consola][] for logging, colors, prompts & basic formatting
- [progress-estimator][] for progress bars
- [ora][] for spinners

## Prerequisites

**Node.js**: `^18.13.0 || ^20.0.0 || ^22.0.0 || ^24.0.0`

**This package is ESM-only.**

## Install

```bash
npm install @lavamoat/vog
```

## Usage

### Logging

`@lavamoat/vog` provides a pre-configured stderr-only logger (`log`) and the abililty to create custom loggers:

```typescript
import { log } from '@lavamoat/vog'

// Basic logging
log.info('Starting process...')
log.warn('This is a warning')
log.error('Something went wrong')

// Debug logging (only shown when LAVAMOAT_DEBUG is set or log level has
// been manually changed)
log.debug('Debug information')

// Create a custom logger
const customLog = log.create({
  level: LogLevels.debug,
  stdout: process.stdout, // Override to use stdout instead of stderr
})
```

#### Default Logger Behavior

- **Always** logs to stderr
- No timestamps or dates
- Fancy formatting for human pleasure

#### Environment Variables

- `LAVAMOAT_DEBUG`: When set to any truthy value, sets the log level of the default logger to "debug".

### Progress Bars

Courtesy of [progress-estimator][].

```typescript
import { progress } from '@lavamoat/vog'

const progressEstimator = progress({
  storagePath: './.progress-estimator', // Optional: where to store estimates
})

// Wrap any async operation
const result = await progressEstimator(
  someAsyncOperation(),
  'Processing files' // Progress message
)
```

### Spinners

Courtesy of [ora][].

```typescript
import { spinner } from '@lavamoat/vog'

const spin = spinner('Loading...').start()

// Do some work
await someAsyncOperation()

spin.succeed('Done!')
// or spin.fail('Failed!')
// or spin.stop()
```

### Utilities

Access to [consola][]'s utility functions are re-exported—in full—from the entrypoint. This gives quick access to colors, ASCII box and tree creation, text alignment, and other formatting utilities:

```typescript
import { yellow, box, log } from '@lavamoat/vog'

const warning = yellow('This is a warning')
const boxedWarning = box(warning, 'WARNING!')

log(boxedWarning)
```

### Complete Example

```typescript
import { log, spinner, progress } from '@lavamoat/vog'
// or:
// import { log } from '@lavamoat/vog/log'
// import { spinner } from '@lavamoat/vog/spinner'
// import { progress } from '@lavamoat/vog/progress'

async function processFiles(files: string[]) {
  log.info(`Processing ${files.length} files...`)

  // Create progress estimator
  const progressEstimator = progress()

  // Process with progress tracking
  const results = await progressEstimator(
    Promise.all(files.map(processFile)),
    'Processing files'
  )

  log.info('✅ All files processed successfully')
  return results
}

async function longRunningTask() {
  const spin = spinner('Performing long operation...').start()

  try {
    await someComplexOperation()
    spin.succeed('Operation completed!')
  } catch (error) {
    spin.fail('Operation failed!')
    log.error('Error:', error)
    throw error
  }
}
```

## Development Notes

This package is an example of a project configured to use Node.js's [type stripping][] facilities.

- It requires the following settings enabled in `tsconfig.json`:

  ```json
  {
    "compilerOptions": {
      "rewriteRelativeImportExtensions": true,
      "verbatimModuleSyntax": true,
      "erasableSyntaxOnly": true
    }
  }
  ```

- `compilerOptions.outDir` of anything _other_ than `.` appears to be forbidden (lookup `ts(2878)`); the output files in `src/` must be siblings.
- Relative imports must have the `.ts` extension.

## License

Copyright © 2025 Consensys, Inc. Licensed MIT

[consola]: https://www.npmjs.com/package/consola
[progress-estimator]: https://www.npmjs.com/package/progress-estimator
[ora]: https://www.npmjs.com/package/ora
[lavamoat]: https://github.com/lavamoat/lavamoat
[type stripping]: https://nodejs.org/api/typescript.html#type-stripping
