# @lavamoat/node

> Warning: This software is _alpha_ quality. Expect bugs and breaking changes!

**`@lavamoat/node` is a [Hardened JavaScript][] runtime** for Node.js v18.0.0+ that provides _per-package_ security policy enforcement.

`@lavamoat/node`:

- Uses [`lockdown`][lockdown] to prevent tampering with the execution environment:
  - User code cannot meddle with JavaScript's global objects or shared intrinsics (i.e. "the
    stuff in the prototype chain")
  - Neutralizes most prototype pollution attacks
- Isolates dependencies _within the same process_:
  - By default, packages do not share references to any global objects
  - Access to resources (global objects, other packages, Node.js builtins,
    native modules) is controlled by user-defined policy
- Provides tooling to _generate_ and _maintain_ the policy

LavaMoat can protect your Node.js application, but it can _also_ protect your development environment (e.g., build scripts) — you can run your tools with [the `lavamoat` CLI](#usage).

## Supply Chain Security

Over time, your application's dependencies will need updating. How can you ensure a new version of a package—or newly-added dependencies—aren't doing something malicious?

`@lavamoat/node` provides a runtime that should work just as before, but with protection against most supply chain attacks.

Nodes.js provides powerful global APIs and builtins without restriction—but most of your app's dependencies _don't need them_. LavaMoat can stop packages from abusing these resources _without_ blocking legitimate use.

Each package can only access resources that are explicitly allowed by the policy. _If a package disallows access to a resource, the environment will behave as if that resource does not exist._ This is a powerful way to prevent malicious packages from doing harm.

## Runtime Security

If a package obfuscates its intentions to the degree that LavaMoat's own policy generation cannot detect what resources it needs, the generated policy will _still_ prevent naughty behavior. This is because LavaMoat operates using the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege). Resources **not explicitly allowed by the policy do not exist** in the package's execution scope—thanks to the `Compartment` provided by [Hardened JavaScript][].

LavaMoat parses code _only_ during policy generation—never at runtime. Policy generation provides a _starting point_ for customization by creating a policy which allows _every resource_ it detects. While reviewing the policy, you can choose to create **policy overrides** to restrict or grant access to resources.

> [!TIP]
>
> Read more about reviewing policy files in the [LavaMoat docs](https://lavamoat.github.io/guides/policy-diff/).

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

Behavior Options:
  -b, --bin      Resolve entrypoint as a bin script                    [boolean]
      --dev      Include development dependencies                      [boolean]
      --verbose  Enable verbose logging                                [boolean]
      --quiet    Disable all logging                                   [boolean]

Path Options:
  -p, --policy                Filepath to a policy file
                                 [string] [default: "lavamoat/node/policy.json"]
  -o, --policy-override       Filepath to a policy override file
                          [string] [default: "lavamoat/node/policy-override.json"]
      --policy-debug          Filepath to a policy debug file
                             [string] [default: "lavamoat/node/policy-debug.json"]
      --project-root, --root  Path to application root directory
                                         [string] [default: (current directory)]

Positionals:
  entrypoint  Path to the application entry point; relative to --project-root
                                                                        [string]

Options:
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]

Resources:

  🌋 LavaMoat on GitHub (https://github.com/LavaMoat/LavaMoat)
  🐛 Bugs? Issue tracker (https://github.com/LavaMoat/LavaMoat/issues)
  📖 Read the LavaMoat docs (https://lavamoat.github.io)
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

[Hardened JavaScript]: https://hardenedjs.org
[lockdown]: https://hardenedjs.org/#lockdown
[lavamoat]: https://npm.im/lavamoat
[@endo/compartment-mapper]: https://npm.im/@endo/compartment-mapper
[policy-guide]: https://lavamoat.github.io/guides/policy/
[docs]: https://lavamoat.github.io
