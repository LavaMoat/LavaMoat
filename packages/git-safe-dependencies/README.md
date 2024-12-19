# git-safe-dependencies

> WARNING: This is an early version. The opinions are still forming and anything can change at any time.

Validate your package.json and lockfile against an opinionated set of rules around using git dependencies coming from LavaMoat.  
No configuration, no excuses.

## Installation

You can install `@lavamoat/git-safe-dependencies` using npm:

```sh
npm install --save-dev @lavamoat/git-safe-dependencies
```

## Usage

```
git-safe-dependencies [--type=yarn|npm] [--ignore=file.json] [--projectRoot=path]
```

- `--type=npm|yarn` - Specify the type of lockfile to lint if it's not obvious from the file name. Supported values are dictated by `lockfile-lint` package.
- `--ignore=file.json` - Specify a JSON file with a list of problem IDs to ignore. Keep the file version controlled to track who ignored what and why.
- `--projectRoot=path` - Specify the root of the project to lint. Defaults to the current working directory.

### Programmatic usage

WIP, but do try :)

```js
const gitSafeDependencies = require('@lavamoat/git-safe-dependencies')
```

TODO: design a more granular programmatic API
