# @lavamoat/harden

A tool for applying security-hardening defaults to your project's package manager configuration.

> [!NOTE]
> This is an early preview of the package versioned 0.x. Changes planned:
>
> - the composition of opinions included in each hardening level may change
> - the CLI visuals and interactions to improve
> - with the release of yarn6 new major changes are to be expected.

## Usage

`@lavamoat/harden` writes opinionated security settings into your project's package manager config files (`.npmrc`, `.yarnrc.yml`, `pnpm-workspace.yaml`, `package.json`). It only modifies security-relevant keys and preserves everything else.

```sh
harden defaults
```

### Install

```sh
npm i -D @lavamoat/harden
```

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

Override the detected package manager with `--package-manager` (`-p`):

```sh
harden defaults -p yarn --level baseline
```

### Options

```
Options:
  -p, --package-manager <pm>  Package manager to harden (npm, yarn, pnpm)
  -l, --level <level>         Hardening level: baseline, moderate, paranoid  [default: moderate]
  -h, --help                  Show help
  -v, --version               Show version
```

## Opinions

This package comes with opinions about:

- package manager versions
- what's allowed to install and run at install time
- lesser known security-relevant settings
- cutting-edge tools to prevent certain classes of supply chain attacks
