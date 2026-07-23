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
- [`harden verify`](#verify) - checks the current config against a level and reports what's missing

### Wizard

```sh
harden wizard
```

Assess your project and interactively apply hardening settings. The wizard will ask questions about your project and apply selected changes.

#### Wizard Options

```text
Options:
  -p, --package-manager <pm>  Package manager to harden (npm, yarn, pnpm)
```

### Apply Defaults

```sh
harden defaults
```

Detects the package manager in use and writes hardening config at the **moderate** level (recommended for most projects). Pass `--level/-l` to adjust:

| Level      | What it covers                                                      |
| ---------- | ------------------------------------------------------------------- |
| `baseline` | Disables lifecycle scripts, blocks git deps, sets release age gate  |
| `moderate` | Everything in baseline + enforces minimum package manager version   |
| `paranoid` | Everything in moderate + additional settings for the extra cautious |

```sh
harden defaults --level paranoid
```

Choose the package manager with `--package-manager/-p` instead of guessing:

```sh
harden defaults -p yarn --level baseline
```

#### Defaults Options

```text
Options:
  -p, --package-manager <pm>  Package manager to harden (npm, yarn, pnpm)
  -l, --level <level>         Hardening level: baseline, moderate, paranoid  [default: moderate]
```

### Verify

```sh
harden verify
```

Checks your project's current package manager configuration against the requested _hardening level_ without making any changes. Prints a checklist of which opinions at the selected level are already satisfied (`✔`) and which are not (`✖`), along with a summary of scores per package manager config source.

This is useful to enforce in CI to ensure a baseline of hardening is maintained.

Exits with code `0` when everything at the selected level is satisfied, and `1` otherwise.

```sh
harden verify --level moderate
harden verify -p yarn -l paranoid
```

#### Verify Options

```text
Options:
  -p, --package-manager <pm>  Package manager to verify against (npm, yarn, pnpm)
  -l, --level <level>         Hardening level: baseline, moderate, paranoid  [default: moderate]
```

## Opinions

`@lavamoat/harden` is an _opinionated_ tool. Here's an outline of what exactly it enforces:

<!-- prettier-ignore-start -->
<!-- no toc -->
- [Package manager versions](#package-manager-versions)
- [Which packages can be installed](#package-installation)
- [Which packages are allowed to run an "install" or "post-install" script](#install-scripts)
- [The environment in which `package.json` scripts run](#script-execution-environment)
- [Cutting-edge tools to prevent certain classes of supply chain attacks](#tools)
- [Lesser-known security-relevant settings](#other)
<!-- prettier-ignore-end -->

### Package Manager Versions

FILL IN

### Package Installation

FILL IN

### Install Scripts

FILL IN

### Script Execution Environment

One of the more advanced capabilities `@lavamoat/harden` brings to the project is the hardening of the environment exposed to scripts run from `package.json` (e.g., `npm run <script>`). It offers the following controls:

- Censoring of environment variables. A `lavamoat/.env.ban.json` file configures censoring environment variables that match given strings
- Rearranges `$PATH` to mitigate [bin confusion][bin-confusion]
- Adds a `scriptsConfig` property to `package.json` where files with [Node.js Permissions][permissions] options can be selected for each script individually with a fallback to `#default`. Example configurations are provided, but it's recommended you customize them to adhere to the [principle of least privilege][least-privilege].

### Tools

FILL IN

### Other

FILL IN

## Notes

FILL IN (could contain info such as how package manager detection works)

## License

© 2023 Consensys Software. Licensed MIT

[permissions]: https://nodejs.org/api/permissions.html
[least-privilege]: https://en.wikipedia.org/wiki/Principle_of_least_privilege
[bin-confusion]: https://socket.dev/blog/npm-bin-script-confusion
