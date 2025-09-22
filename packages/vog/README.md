# @lavamoat/vog

> CLI utilities for [LavaMoat][]

## Motivation

We want a simple package we can use across LavaMoat CLI tools for common CLI needs.

This package is mostly a thin wrapper around a few CLI libraries:

- [consola][] for logging, colors, prompts & basic formatting
- [@opentf/cli-pbar][] for progress bars
- [cli-spinner][] for spinners

## Prerequisites

**Node.js**: `^22.6.0 || ^24.0.0`

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

Courtesy of [@opentf/cli-pbar][].

```typescript
import { progress } from '@lavamoat/vog'

const pBar = new progress.ProgressBar()
pBar.start({ total: 100 })
pBar.update({ value: 50 })
pBar.update({ value: 100 })
pBar.stop()
```

### Spinners

Courtesy of [cli-spinner][].

```typescript
import { spinner } from '@lavamoat/vog'

const spin = new spinner.Spinner('processing.. %s')
spin.setSpinnerString('|/-\\')
spin.start()
spin.stop()
```

### Utilities

Access to [consola][]'s utility functions are re-exported—in full—from the entrypoint. This gives quick access to colors, ASCII box and tree creation, text alignment, and other formatting utilities:

```typescript
import { yellow, box, log } from '@lavamoat/vog'

const warning = yellow('This is a warning')
const boxedWarning = box(warning, 'WARNING!')

log(boxedWarning)
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
- [@types/cli-spinner][] is a production dependency, since we re-export the associated package in full.

## License

Copyright © 2025 Consensys, Inc. Licensed MIT

[consola]: https://www.npmjs.com/package/consola
[@opentf/cli-pbar]: https://www.npmjs.com/package/@opentf/cli-pbar
[cli-spinner]: https://www.npmjs.com/package/cli-spinner
[@types/cli-spinner]: https://www.npmjs.com/package/@types/cli-spinner
[lavamoat]: https://github.com/lavamoat/lavamoat
[type stripping]: https://nodejs.org/api/typescript.html#type-stripping
