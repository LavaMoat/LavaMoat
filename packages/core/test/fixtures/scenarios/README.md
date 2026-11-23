# LavaMoat Scenario Fixtures

This directory contains committed, on-disk scenario fixtures for testing the
LavaMoat core runtime and platform integrations.

## Directory layout

```
fixtures/scenarios/
├── shared/        Scenarios consumed by lavamoat-core AND platform packages
│   ├── <group>/
│   │   └── <slug>/
│   │       ├── scenario.json         Required  – scenario descriptor
│   │       ├── entry.js              Required  – entry point module
│   │       ├── package.json          Optional  – package manifest
│   │       ├── node_modules/         Committed – package dependencies
│   │       │   └── <dep>/index.js
│   │       ├── lavamoat/
│   │       │   └── node/
│   │       │       └── policy.json   Optional  – LavaMoat policy (see below)
│   │       └── setup.js              Optional  – pre-lockdown setup (see below)
└── core/          Scenarios only run by lavamoat-core (formerly inline specs)
    └── <group>/<slug>/               Same layout as shared/
```

> **Note on `node_modules/`**: These subdirectories are intentionally committed
> and excluded from `.gitignore` via a negation rule in the root `.gitignore`.
> The generated `.package-lock.json` files inside them are also excluded.

## `scenario.json` format

The format is described by the JSON Schema in
[`scenario.schema.json`](../../scenario.schema.json).

```jsonc
{
  // Lets editors validate this file against the schema (ignored by the loader)
  "$schema": "https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/core/test/scenario.schema.json",

  // Human-readable scenario name (used as the AVA test title)
  "name": "group - short description",

  // Expected outcome of the scenario run (required – pick one shape)
  "expect": {
    // Deep-equal check against the entry's JSON-serialised result
    "result": <any JSON value>
  },

  // OR:
  "expect": { "truthy": true },   // result must be truthy
  "expect": { "falsy":  true },   // result must be falsy
  "expect": { "error": "<regex source>" }, // must throw, message matches regex

  // ── Optional fields ──────────────────────────────────────────────────────

  // Relative path to a setup.js file (default: no setup)
  "setupPath": "setup.js",

  // Enable globalThis scuttling for this scenario
  "scuttleGlobalThis": {
    "enabled": true,
    "exceptions": ["AAA"]
  },

  // Extra globalThis aliases for the root compartment (default: ["globalThis", "global"])
  "globalThisRefs": ["globalThis", "global", "self"]
}
```

### Policy

The policy is _not_ part of `scenario.json`.  The scenario runs under the
policy in the fixture's `lavamoat/node/policy.json`, which is where
`@lavamoat/node` looks for a policy by default.  If the fixture has no such
file, the scenario runs under the empty policy:

```json
{ "resources": {} }
```

### How the entry module reports its result

The entry module must write its result to `module.exports` (CJS style).  The
runner JSON-serialises `module.exports` and writes it to stdout.  The test
harness then parses that JSON and compares it against `scenario.json`'s
`expect` field.

A simple passing entry:

```js
// entry.js
module.exports = 42
```

## `setup.js` – pre-`lockdown()` setup

When `scenario.json` includes `"setupPath": "setup.js"`, the file at that path
is `require()`-d **before** `lockdown()` is called.

### Injecting globals

`setup.js` can assign properties to `globalThis` to simulate browser-like or
custom runtime globals that the module code expects:

```js
// setup.js – inject a custom global
globalThis.AAA = '111'
```

### Providing fake builtins (core/ fixtures only)

For `core/` fixtures that test the builtin policy mechanism, `setup.js` may
export a `builtins` object.  These fake builtins are passed to the reference
runtime as `extraBuiltins` and can be `require()`-d by module code (subject to
the policy):

```js
// setup.js – fake builtins
module.exports = {
  builtins: {
    abc: 123,
    xyz: { SomeClass: class {} },
  },
}
```

### Shared/ fixtures and `setup.js`

Because `@lavamoat/node`'s production runner has no concept of a pre-`lockdown`
setup phase, **shared/ fixtures with a `setupPath` are automatically skipped**
(marked `test.failing`) in the `@lavamoat/node` integration test suite.  Only
scenarios without a `setupPath` (or those explicitly listed in
`EXPECTED_SUCCESSFUL_SCENARIOS`) run as regular passing tests there.

## Adding a new scenario

1. Create a directory under `shared/` (cross-platform) or `core/` (core-only):

   ```
   shared/<group>/<descriptive-slug>/
   ```

2. Write `entry.js`:

   ```js
   // entry.js
   const dep = require('dep')
   module.exports = dep.doSomething()
   ```

3. Create `node_modules/<dep>/index.js` (and any transitive deps).

4. Write `lavamoat/node/policy.json` with the policy (skip this if the
   scenario needs only the empty policy).  You can generate a baseline by
   running:

   ```bash
   node packages/node/src/cli.js generate entry.js \
     --policy lavamoat/node/policy.json
   ```

5. Write `scenario.json` with `$schema`, `name` and `expect`.

6. If the scenario requires custom globals, add `setup.js` and set
   `"setupPath": "setup.js"` in `scenario.json`.

## Loaded by

| File | Loads |
|------|-------|
| `packages/core/test/scenarios/index.js` | `shared/` + `core/` |
| `packages/core/test/run-scenarios.spec.js` | Both via `loadScenarios()` / `loadCoreScenarios()` |
| `packages/node/test/integration/scenario.spec.js` | `shared/` only (via `loadScenarios()`) |
