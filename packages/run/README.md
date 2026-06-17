# @lavamoat/run

> Warning: This software is _alpha_ quality. Expect bugs and breaking changes!

**A secure replacement for `npx`.**

`npx <pkg>` will happily download an arbitrary package from the registry and
execute it on your machine with **full ambient authority** — and it runs the
package's lifecycle (install) scripts _the instant it is fetched_, before any
of its code is even invoked. This is one of the most direct software
supply-chain attack vectors in the JavaScript ecosystem.

`lavax` (the bin shipped by `@lavamoat/run`) does the same job — fetch a package
and run its bin — but applies [LavaMoat][]'s security principles:

1. **Install scripts are disabled by default.** Packages are installed with
   `--ignore-scripts` (the same protection as
   [`@lavamoat/allow-scripts`][allow-scripts]), so `preinstall`/`install`/
   `postinstall` code never runs. Opt back in per-invocation with
   `--allow-scripts`.
2. **The bin runs inside [Hardened JavaScript][] (SES `lockdown()`).** The
   fetched code cannot tamper with shared intrinsics (`Object`, `Array`,
   `Promise`, …), neutralizing most prototype-pollution attacks.
3. **Per-package least authority.** Execution is delegated to
   [`@lavamoat/node`][node]. A LavaMoat policy is generated on first use and
   enforced on every run: each package only gets the globals and builtins it
   actually needs. The fetched package is always treated as an **untrusted
   root**.
4. **Isolation & transparency.** Packages are installed into a per-spec sandbox
   under a cache directory (never your project), and the generated policy is
   written there for you to review.

## Installation

`@lavamoat/run` requires Node.js v20.19.0 or newer.

```sh
npm install -g @lavamoat/run
```

## Usage

```text
lavax [options] <spec> [args..]
```

Everything after `<spec>` is forwarded verbatim to the package's bin — exactly
like `npx`:

```sh
# fetch & run "cowsay", forwarding `Hello!` to it
lavax cowsay Hello!

# pin a version
lavax cowsay@1.5.0 Moo

# scoped package, choosing a specific bin
lavax --call some-bin @scope/tool --flag value

# run a local package by path
lavax ./my-cli --some-flag
```

On the first run of a given spec, `lavax` will:

1. install the package into a sandbox (scripts disabled),
2. generate a LavaMoat policy for its bin,
3. run the bin under SES with that policy enforced.

Subsequent runs of the same spec reuse the cached install and policy.

### Options

| Option              | Description                                                                |
| ------------------- | -------------------------------------------------------------------------- |
| `-c, --call <name>` | Bin name to run when the package exposes more than one                     |
| `--allow-scripts`   | **DANGEROUS:** allow lifecycle (install) scripts to run during install     |
| `--regenerate`      | Regenerate the policy instead of reusing the cached one                    |
| `--force`           | Reinstall the package even if a cached install exists                      |
| `--dev`             | Include dev dependencies / use the `development` condition                 |
| `--registry <url>`  | npm registry URL to install from                                           |
| `--cache <dir>`     | Cache base directory (default: `$LAVAMOAT_RUN_CACHE` or `~/.lavamoat/run`) |
| `-p, --policy <p>`  | Path to a policy file (default: within the cache directory)                |
| `--verbose`         | Enable verbose logging                                                     |
| `--quiet`           | Disable all but error logging                                              |

### Environment variables

- `LAVAMOAT_RUN_CACHE` — overrides the cache base directory.
- `LAVAMOAT_DEBUG` — enables debug logging (as in `@lavamoat/node`).

## How it relates to other LavaMoat tools

`@lavamoat/run` is glue: it combines the protections of
[`@lavamoat/allow-scripts`][allow-scripts] (no install scripts) and
[`@lavamoat/node`][node] (SES + per-package policy) into a single
`npx`-shaped command for **ad-hoc execution of packages you don't necessarily
trust.**

## Programmatic API

```js
import { lavax } from '@lavamoat/run'

await lavax('cowsay', ['Hello!'], { quiet: true })
```

> Importing `@lavamoat/run` imports `@lavamoat/node`, which calls SES
> `lockdown()`. If you only need the pure helpers (e.g. `parseSpec`), import the
> relevant submodule directly to avoid `lockdown()`.

## Known limitations

`@lavamoat/run` inherits the capabilities — and the rough edges — of
`@lavamoat/node` (which is itself _alpha_):

- Some packages perform dynamic `require()`s or mutate primordials and will
  need a hand-written [policy override][policy-guide] to run. The generated
  policy is only a starting point.
- Packages relying on native addons typically need `--allow-scripts` (which
  disables a core protection — use only for packages you trust).
- The policy is generated via static analysis ("trust on first use"); review it
  in the sandbox's `lavamoat/node/policy.json` before relying on it.

## License

©️ 2024 Consensys Software. Licensed MIT

[LavaMoat]: https://github.com/LavaMoat/LavaMoat
[Hardened JavaScript]: https://hardenedjs.org
[node]: https://github.com/LavaMoat/LavaMoat/tree/main/packages/node
[allow-scripts]: https://github.com/LavaMoat/LavaMoat/tree/main/packages/allow-scripts
[policy-guide]: https://lavamoat.github.io/guides/policy/
