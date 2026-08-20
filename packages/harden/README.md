# @lavamoat/harden

A CLI tool for applying security-hardening defaults to your project's package manager configuration.

> [!NOTE]
> This is an early preview of the package versioned 0.x. Changes planned:
>
> - the composition of opinions included in each hardening level may change
> - the CLI visuals and interactions to improve
> - with the release of yarn6 new major changes are to be expected.

## What Does It Do?

`@lavamoat/harden` writes opinionated security settings into your project's package manager config files (`.npmrc`, `.yarnrc.yml`, `pnpm-workspace.yaml`) and `package.json`. It only modifies security-relevant keys and preserves everything else.

For details, see [Opinions](#opinions).

## Usage

- [`harden wizard`](#wizard) - interactively applies the hardening by asking questions
- [`harden defaults`](#apply-defaults) - applies the hardening by level
- [`harden check`](#check) - checks the current config against a level and reports what's missing

### Wizard

```sh
harden wizard
```

Assess your project and interactively apply hardening settings. The wizard will ask questions about your project and apply selected changes.

#### Wizard Options

```text
Options:
  -p, --package-manager <pm>  Package manager to harden (npm, yarn, pnpm)
  -d, --decisions-snapshot <file>  Path to decisions snapshot file (JSON) to pre-fill wizard
  -s, --save-decisions  Save decisions snapshot to ./decisions-snapshot.json at end of run
```

### Apply Defaults

```sh
harden defaults
```

Detects the package manager in use and writes hardening config at the **moderate** level (recommended for most projects). Pass `--level/-l` to adjust:

| Level      | What it covers                                                     |
| ---------- | ------------------------------------------------------------------ |
| `baseline` | Disables lifecycle scripts, blocks git deps, sets release age gate |
| `moderate` | Everything in baseline + enforces minimum package manager version  |
| `strict`   | Maximum hardening, everything the package has to offer             |

```sh
harden defaults --level strict
```

Choose the package manager with `--package-manager/-p` instead of guessing:

```sh
harden defaults -p yarn --level baseline
```

#### Defaults Options

```text
Options:
  -p, --package-manager <pm>  Package manager to harden (npm, yarn, pnpm)
  -l, --level <level>         Hardening level: baseline, moderate, strict  [default: moderate]
  -d, --decisions-snapshot <file>  Path to decisions snapshot file (JSON) to apply regardless of level set
  -s, --save-decisions  Save decisions snapshot to ./decisions-snapshot.json at end of run (useful as a template to edit and re-use)
```

### Decisions Snapshot

Use `--decisions-snapshot/-d` to load a JSON file with saved decisions.
Use `--save-decisions/-s` to write the final decisions to `./decisions-snapshot.json`.

- In `wizard`, matching entries pre-fill prompts.
- In `defaults`, matching entries override level-based defaults.

Example:

```json
{
  "n_engines": true,
  "n_scripts": "n_allowscripts",
  "n_git": true,
  "n_strictgit": false,
  "n_filterenv": true
}
```

Wizard can save a snapshot of your decisions at the end with `-s`. It will also write `decisions-snapshot.json` in the current working directory so you can re-use it later.
You can also put together a subset of decisions. This is a good way to share decisions across a team or opt-out of certain opinions without having to go down a level in `harden defaults`.

Example:

```sh
harden wizard -s
harden defaults -d ./decisions-snapshot.json
```

### Check

```sh
harden check
```

Checks your project's current package manager configuration against the requested _hardening level_ without making any changes. Prints a checklist of which opinions at the selected level are already satisfied (`✔`) and which are not (`✖`), along with a summary of scores per package manager config source.

This is useful to enforce in CI to ensure a baseline of hardening is maintained.

Exits with code `0` when everything at the selected level is satisfied, and `1` otherwise.

```sh
harden check --level moderate
harden check -p yarn -l strict
```

#### Check Options

```text
Options:
  -p, --package-manager <pm>  Package manager to check against (npm, yarn, pnpm)
  -l, --level <level>         Hardening level: baseline, moderate, strict  [default: moderate]
  --json                      Output machine-readable JSON to stdout
```

## Opinions

`@lavamoat/harden` is an _opinionated_ tool. Here's an outline of what exactly it enforces:

<!-- prettier-ignore-start -->
<!-- no toc -->
- [Package manager versions](#package-manager-versions)
- [Which packages are allowed to run an "install" or "post-install" script](#install-scripts)
- [The environment in which `package.json` scripts run](#script-execution-environment)
- [Lesser-known security-relevant settings](#other)
<!-- prettier-ignore-end -->

### Package Manager Versions

`@lavamoat/harden` enforces a minimum version of the package manager in use. The reason for this is nothing to do with vulnerabilities in older versions, but it's about availability of security-related features. For example, `yarn` minimum is, among other things, one of the earliest versions that limit git dependencies; `npm` minimum is one of the earliest versions that support `--ignore-scripts`.

If you use the wizard, you can opt-in to set the minimum to current latest version.

### Install Scripts

Now that all package managers support a way to skip running lifecycle scripts, we use that. Yarn is, at the time of writing, not supporting a way to pin to specific versions, which we're trying to do as it's preventing your trusted packages being taken over from impacting you before you notice.

Depending on your strictness choice, for yarn we can use the built-in `dependenciesMeta` feature to allow scripts for specific packages, or we can use `@lavamoat/allow-scripts` to be more precise about what's allowed. Note that `allow-scripts` requires that yarn creates a `node_modules` folder instead of using Plug'n'Play, so we live it up to you to decide on the tradeoff.

> If you choose to approve detected lifecycle scripts in your dependencies, `@lavamoat/harden` will (except `yarn dependenciesMeta`) generate entries with version pinned. You should keep them pinned to the version you actually use. None of the package managers support enforcing that the versions remain pinned (at the time of writing).  
> Future versions of `@lavamoat/harden` may help with that if we find a way to enforce it.

### Script Execution Environment

One of the more advanced capabilities `@lavamoat/harden` brings to the project is the hardening of the environment exposed to scripts run from `package.json` (e.g., `npm run <script>`). It offers the following controls:

- Censoring of environment variables. A `lavamoat/.env.ban.json` file configures censoring environment variables that match given strings
- Rearranges `$PATH` to mitigate [bin confusion][bin-confusion]
- Adds a `scriptsConfig` property to `package.json` where files with [Node.js Permissions][permissions] options can be selected per script with a fallback to `#default`. Example configurations are provided, but it's recommended you customize them to adhere to the [principle of least privilege][least-privilege].

`scriptsConfig` matching rules:

- Exact script name match has highest priority.
- Prefix wildcard keys ending in `*` are supported (for example, `lint:*` matches `lint:eslint` and `lint:types`).
- If multiple wildcard prefixes match, the longest prefix wins.
- If there is no exact or wildcard match, `#default` is used when present.

Example:

```json
{
  "scriptsConfig": {
    "lint:*": "lavamoat/scripts.strict.json",
    "lint:fix": "lavamoat/scripts.loose.json",
    "#default": "lavamoat/scripts.loose.json"
  }
}
```

### Other

`@lavamoat/harden` attempts to cover all of the security-relevant settings for package managers, so things like age gates, git dependencies limitations, and package-manager-specific settings like `pnpm`'s `trustPolicy: no-downgrade` are all covered.

## License

© 2023 Consensys Software. Licensed MIT

[permissions]: https://nodejs.org/api/permissions.html
[least-privilege]: https://en.wikipedia.org/wiki/Principle_of_least_privilege
[bin-confusion]: https://socket.dev/blog/npm-bin-script-confusion
