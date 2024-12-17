# lockfile-lint

Validate your lockfile against an opinionated set of rules coming from LavaMoat.  
No configuration, no excuses.

The `@lavamoat/lockfile-lint` package is using the `lockfile-lint-api` package and building an opinionated set of validations on top of it.

## Installation

You can install `@lavamoat/lockfile-lint` using npm:

```sh
npm install --save-dev @lavamoat/lockfile-lint
```

## Usage

```
lavamoat-lockfile-lint package-lock.json
lavamoat-lockfile-lint yarn.lock
```

## Options

- `--type=npm|yarn` - Specify the type of lockfile to lint if it's not obvious from the file name. Supported values are dictated by `lockfile-lint` package, currently:`npm` and `yarn`.
- `--ignore=file.json` - Specify a JSON file with a list of problem IDs to ignore. Keep the file version controlled to track who ignored what and why
