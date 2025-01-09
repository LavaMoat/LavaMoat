# @lavamoat/node

> Nether-age secure runtime for Node.js

**`@lavamoat/node` is a [Hardened JavaScript][] runtime for Node.js v18.0.0+.**

`@lavamoat/node`:

- Uses [`lockdown`][lockdown] to prevent tampering with the execution environment:
  - User code cannot meddle with global objects or shared intrinsics (i.e. "the
    stuff in the prototype chain")
  - Neutralizes prototype pollution attacks
- Isolates dependencies _within the same process_:
  - By default, packages do not share references to any global objects
  - Access to resources (global objects, other packages, Node.js builtins,
    native modules) is controlled by user-defined policy
- Secures your supply chain by generating and maintaining (with your help) policies

LavaMoat is built on top of [SES][].

## Supply Chain Security

Over time, your application's dependencies will change. When they do, LavaMoat detects any changes to resource access. For example, if an upgraded transitive dependency now uses the `left-pad` package, this will be evident from an auto-generated policy file. You can then choose to allow or deny this access (or stop using `left-pad`).

In this way, LavaMoat is a little like [Socket][], which alerts you to dubious changes in a package's behavior (among other things). LavaMoat, however, surfaces _all_ such changes; it's _up to you_ to decide whether or not they're reasonable.

## Runtime Security

LavaMoat also guards against deceptive packages. If a package obfuscates its intentions to the degree that LavaMoat's own policy generation didn't detect it, the existing policy will prevent naughty behavior.

LavaMoat can protect your Node.js application, but it can _also_ protect your development environment (e.g., build tooling)—you can run your tools with [the `lavamoat` CLI](#usage).

## Differences from [lavamoat][]

`@lavamoat/node` is intended to be a _replacement_ for `lavamoat`.

- Leverages [@endo/compartment-mapper][] instead of a custom kernel, and thus
  **supports ECMAScript modules** out-of-the-box
- The `lavamoat` CLI differs in its commands and options

## Installation

`@lavamoat/node` requires Node.js v18.0.0 or newer.

```sh
npm install @lavamoat/node
```

## Usage

> [!IMPORTANT]
>
> Before proceeding, it's recommended to [check out LavaMoat's docs][docs].
> Understanding LavaMoat's concepts will help you cross the LavaMoat Drawbridge
> of Success™.

### Setup

1. [Install `@lavamoat/node`](#installation)
2. Generate a policy file:

   ```sh
   npx exec lavamoat generate <your-app-entrypoint>
   ```

   This will create a `lavamoat/node/policy.json` file in your project root.

3. Run your application with `@lavamoat/node`:

   ```sh
   npx exec lavamoat <your-app-entrypoint>
   ```

   This will run your application with the generated policy.

4. If step 3 failed, you may need to [manually override policy][policy-guide].
5. If you're still having trouble, [the LavaMoat docs][docs] can help.

### `lavamoat` CLI Usage

`lavamoat` has two commands: `run` (the default) and `generate`.

```text
lavamoat <entrypoint>

Run a Node.js application safely

Commands:
  lavamoat run <entrypoint>       Run a Node.js application safely     [default]
  lavamoat generate <entrypoint>  Generate a policy               [aliases: gen]

Path Options:
  -p, --policy           Filepath to a policy file
                                 [string] [default: "lavamoat/node/policy.json"]
  -o, --policy-override  Filepath to a policy override file
                        [string] [default: "lavamoat/node/policy-override.json"]
      --policy-debug     Filepath to a policy debug file
                           [string] [default: "lavamoat/node/policy-debug.json"]
      --root             Path to application root directory
                                         [string] [default: (current directory)]

Behavior Options:
      --dev  Include development dependencies          [boolean] [default: true]

Positionals:
  entrypoint  Path to the application entry point; relative to --root   [string]

Options:
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]

Resources:

  🌋 LavaMoat on GitHub (​https://github.com/LavaMoat/LavaMoat​)
  🐛 Bugs? Issue tracker (​https://github.com/LavaMoat/LavaMoat/issues​)
  📖 Read the LavaMoat docs (​https://lavamoat.github.io​)
```

To print the above text, execute:

```sh
npx exec lavamoat --help
```

To see help for the `generate` command, execute:

```sh
npx exec lavamoat generate --help
```

## Known Issues

The following issues (or missing features) are _intended to be resolved_:

- `await import()` is not yet supported in CommonJS scripts
- _Scuttling_ (i.e. "deletion" of unused objects from the execution environment)
  is not yet supported

### Out of Scope

- Tools which heavily malign the runtime environment (e.g., `jest`) are unsupported.

## License

©️ 2023 Consensys Software. Licensed MIT

[SES]: https://npm.im/ses
[Hardened JavaScript]: https://hardenedjs.org
[lockdown]: https://hardenedjs.org/#lockdown
[lavamoat]: https://npm.im/lavamoat
[@endo/compartment-mapper]: https://npm.im/@endo/compartment-mapper
[Socket]: https://socket.dev
[policy-guide]: https://lavamoat.github.io/guides/policy/
[docs]: https://lavamoat.github.io
