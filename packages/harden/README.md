# @lavamoat/harden

A tool for applying security-hardening defaults to your project's package manager configuration.

> [!NOTE]
> This is an early preview of the package versioned 0.x. Changes planned:
>
> - the composition of opinions included in each hardening level may change
> - the CLI visuals and interactions to improve
> - with the release of yarn6 new major changes are to be expected.

## Install

Get the `harden` CLI tool somehow:

```sh
npm i -g @lavamoat/harden
npm i -D @lavamoat/harden
npx @lavamoat/harden
```

## Usage

`@lavamoat/harden` writes opinionated security settings into your project's package manager config files (`.npmrc`, `.yarnrc.yml`, `pnpm-workspace.yaml`, `package.json`). It only modifies security-relevant keys and preserves everything else.

`harden defaults` - applies the hardening by level

`harden wizard` - interactively applies the hardening by asking questions

### Apply defaults

```sh
harden defaults
```

Detects the package manager in use and writes hardening config at the **moderate** level (recommended for most projects). Pass `--level` to adjust:

| Level      | What it covers                                                      |
| ---------- | ------------------------------------------------------------------- |
| `baseline` | Disables lifecycle scripts, blocks git deps, sets release age gate  |
| `moderate` | Everything in baseline + enforces minimum package manager version   |
| `paranoid` | Everything in moderate + additional settings for the extra cautious |

```sh
harden defaults --level paranoid
```

Choose the package manager with `--package-manager` (`-p`) instead of guessing:

```sh
harden defaults -p yarn --level baseline
```

#### Options

```
Options:
  -p, --package-manager <pm>  Package manager to harden (npm, yarn, pnpm)
  -l, --level <level>         Hardening level: baseline, moderate, paranoid  [default: moderate]
  -h, --help                  Show help
  -v, --version               Show version
```

### Wizard

```sh
harden wizard
```

Assess your project and interactively apply hardening settings. The wizard will ask questions about your project and apply selected changes.

## Opinions

This package comes with opinions about:

- package manager versions
- what's allowed to install and run at install time
- lesser known security-relevant settings
- cutting-edge tools to prevent certain classes of supply chain attacks

### Running scripts

One of the more advanced capabilities this package brings to the project is the hardening of the environment in which the `package.json->scripts` run. It offers the following controls:

- `lavamoat/.env.ban.json` file to configure censoring env variables that match given strings
- rearranges `$PATH` to make [bin confusion](https://socket.dev/blog/npm-bin-script-confusion) impossible
- adds `package.json->scriptsConfig` where files with [Node.js Permissions](https://nodejs.org/api/permissions.html) options can be selected for each script individually with a fallback to `#default`. Example configurations are provided, but it's recommended you customize them to allow the minimal access necessary.
