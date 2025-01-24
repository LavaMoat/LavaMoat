# git-safe-dependencies

> WARNING: This is an alpha version. The opinions are still forming and anything can change at any time. Test coverage is incomplete. Use at your own risk.

Validate your `package.json` and lockfile (NPM, Yarn classic or Yarn Berry) and your GitHub Actions workflow files against an opinionated set of rules around using git dependencies that we at LavaMoat recommend.  
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
- `--ignore=file.json` - Specify a JSON file with a list of problem IDs to ignore (if you must). Keep the file version controlled to track who ignored what and why.
- `--projectRoot=path` - Specify the root of the project to lint. Defaults to the current working directory.

```
git-safe-actions [--workflows=path] [--ignore=file.json]
```

- `--ignore=file.json` - Specify a JSON file with a list of problem IDs to ignore (if you must). Keep the file version controlled to track who ignored what and why.
- `--workflows=path` - Specify the path to the directory with GitHub Actions workflow files. Defaults to `.github` and searches recursively.

### Programmatic usage

WIP, but do try :)

```js
const gitSafeDependencies = require('@lavamoat/git-safe-dependencies')
```

TODO: design a more granular programmatic API

## FAQ

#### Why is this not a plugin/rule for one of the many linters?

- It makes http requests and that's unlikely to vibe with any linter.
