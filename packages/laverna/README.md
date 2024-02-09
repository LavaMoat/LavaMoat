# Laverna

> Publish multiple workspaces (that's all)

If you're familiar with [lerna](https://lerna.js.org), **Laverna** does this: `lerna publish from-package`.

If you're unfamiliar with it: **Laverna** publishes all workspacess wherein the _current_ version hasn't yet been published.

## Features

**Laverna** is a thin wrapper around `npm publish` which:

- Invokes `npm publish` on _all_ workspaces _where the current version has not yet been published_
- Publishes new packages via flag
- Ignores private packages
- Requires confirmation (by default)
- Prints all output from `npm publish`, including the output of `npm pack`, to enable review prior to confirmation
- Provides a "dry-run" mode

**Laverna**'s scope is intentionally limited to the above use-case.

## Non-Features

Perhaps more importantly, **Laverna**:

- Builds nothing
- Bumps no versions
- Runs no user-defined scripts
- Retains no state nor cache
- Does not write to `package.json` or lockfiles
- Does not interact with `git` (no tags, no commits, no pushes)
- Does not interact with GitHub (no releases)
- Avails no whims

## Supported Environments

- Node.js v18.13.0+
- `npm` v8.19.3+

## Install

It's recommended to install as a dev dependency:

```shell
npm install @lavamoat/laverna -D
```

## Usage Summary

```plain
laverna [options..]

"Publish multiple workspaces (that's all)"

Options:

 --dryRun        - Enable dry-run mode
 --root=<path>   - Path to workspace root (default: current working dir)
 --newPkg=<name> - Workspace <name> should be treated as a new package (repeatable)
 --yes/-y        - Skip confirmation prompt (default: false; true in CI)

Problems? Visit https://github.com/LavaMoat/LavaMoat/issues
```

## Examples

### Using Release Please or Similar

For a typical release workflow, you might:

1. Bump workspace versions (e.g. via [release-please-action](https://github.com/google-github-actions/release-please-action))
2. In your updated working copy's workspace root, run `npm exec laverna` (or `npm exec laverna -- --dryRun` first)
3. Bask in glory

### Publishing a New Package

If you're publishing a package in a new workspace, you might:

1. Set the initial version of the new package (call it `foo`) in its `package.json`.
2. Run `npm exec laverna -- --newPkg=foo` (or `npm exec laverna -- --newPkg=foo --dryRun` first)
3. Profit

### Automating Publishes

If the `CI` environment variable is present, `laverna` will skip the confirmation prompt before final publish (i.e., `--yes` defaults to `true`).

> [!WARNING]
> Publishing via CI can bypass 2FA protections. Use at your own risk!

## API

**Laverna** provides a programmable JavaScript API (for what it's worth).

Refer to the TypeScript definitions for details.

## Notes

[LavaMoat](https://github.com/LavaMoat/LavaMoat) needed something that did this, but didn't need Lerna for anything else. So, here we are.

## License

Copyright © 2023 Consensys, Inc. Licensed MIT
