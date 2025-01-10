# @lavamoat/node

> Warning: You are looking at an early version of this packages. Breaking changes and bugs are to be expected.

**`@lavamoat/node` is a [Hardened JavaScript][] runtime for Node.js v18.0.0+ that provides per-package security policy enfocement**

`@lavamoat/node`:

- Uses [`lockdown`][lockdown] to prevent tampering with the execution environment:
  - User code cannot meddle with JavaScript's global objects or shared intrinsics (i.e. "the
    stuff in the prototype chain")
  - Neutralizes most prototype pollution attacks
- Isolates dependencies _within the same process_:
  - By default, packages do not share references to any global objects
  - Access to resources (global objects, other packages, Node.js builtins,
    native modules) is controlled by user-defined policy
- Provides tools for generating and maintaining the policy without the need to manually create all of it.

LavaMoat can protect your Node.js application, but it can _also_ protect your development environment (e.g., build scripts) — you can run your tools with [the `lavamoat` CLI](#usage).

## Supply Chain Security

Over time, your application's dependencies will get updated. It's easy to update to a version of a package that introduces malicious code or a new dependency on a malicious package.

`@lavamoat/node` provides a runtime that should work just as before, but with protection against most supply chain attacks.

Powerful APIs and Node builtins are available globally or through imports without restriction despite only very few dependencies of your application actually need to use them. LavaMoat can stop packages trying to abuse these resources without blocking their intended use.

Each package can only access resources that are explicitly allowed by the policy. If a resource is not allowed for a package, the environment will behave as if that resource doesn't even exist. This is a powerful way to prevent malicious packages from doing harm.

## Runtime Security

If a package obfuscates its intentions to the degree that LavaMoat's own policy generation didn't detect what it's using, the existing policy will prevent naughty behavior because LavaMoat doesn't rely on reading the code for the protections it provides. It makes sure resources not allowed by the policy for the package simply don't exist in the package's execution scope. (thanks to [Hardened JavaScript][] Compartments)

The only time LavaMoat reads the code is when generating a policy. Policy generation is there to provide a starting point for customization and it allows every resource it detects. You can use policy-overrides to restrict resources that are allowed for a package. And you need to review the policy you generate. (More on policy review in the [LavaMoat docs](https://lavamoat.github.io/guides/policy-diff/))

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

[SES]: https://npm.im/ses
[Hardened JavaScript]: https://hardenedjs.org
[lockdown]: https://hardenedjs.org/#lockdown
[lavamoat]: https://npm.im/lavamoat
[@endo/compartment-mapper]: https://npm.im/@endo/compartment-mapper
[Socket]: https://socket.dev
[policy-guide]: https://lavamoat.github.io/guides/policy/
[docs]: https://lavamoat.github.io
