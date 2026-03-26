# Custom capabilities

## Design

A custom capability is conceptually similar to an attenuator mixed with a repair. Instead of a single item being endowed to a compartment for a package, the capability implementation is invoked and can modify the compartment's globalThis according to its defaults or parameters provided to it in policy.

The design consists of two parts:

1. How custom capabilities are defined and used in policy files.
2. The structure of the custom capability implementation.

### Terminology

- **Capability Module** — A JS module whose default export is an array of `{ names, file }` entries that map capability names to implementation file paths. Listed in the policy `use` field.
- **Capability File** — The implementation file that calls `repair()` and/or `defineCapability()` to register behavior. Evaluated in an isolated Compartment at startup.

### Using capabilities in policy

Capability Modules are selected at the top level with the `use` field. The `use` field is valid in both `policy.json` and `policy-override.json`. Precise selection is important for webpack bundle size but less important in Node.js.

All capabilities listed in `use` are loaded and evaluated at startup. Every `repair` callback registered by any loaded capability is executed between `repairIntrinsics()` and `hardenIntrinsics()`.

The `capabilities` field in a resource entry specifies which capabilities' `endow` functions should be applied to that resource's compartment. Each key is a capability name; its value is an array of options passed to the `endow` callback.

```js
{
  "use": [
    "@lavamoat/node/caps/reasonable-process",
    "@lavamoat/core/caps/defineProperty-global",
    "./customcaps/mycapability.js"
  ],
  "resources": {
    "$root$": {
      "capabilities": {
        "reasonable-process": [] // trim dangerous process capabilities globally
      }
    },
    "some>package": {
      "capabilities": {
        "define-to-set": [],
        "endow-symbol-write": ["nameofthesymbol", "nameofAnotherSymbol"]
      },
      "globals": {}
    },
    "other>package": {
      "globals": {
        "process": true // still protected by the root capability
      }
    }
  }
}
```

The strings in the `use` array are valid module specifiers resolved from the location of the policy file. This covers simple cases; for composition, a local Capability Module can re-export a selection of capabilities from multiple dependencies.

### Defining capabilities

#### Capability Module

A Capability Module is a JS module with a default export that is an array of entries, each mapping one or more capability names to an implementation file:

```js
module.exports = [
  {
    names: ['define-to-set', 'endow-symbol-redefine'],
    file: require.resolve('./src/define-set.js'),
  },
  {
    names: ['endow-symbol-write'],
    file: require.resolve('./src/symbol-write.js'),
  },
  {
    names: ['reasonable-process'],
    file: require.resolve('./src/reasonable-process.js'),
  },
]
```

Capability names must be unique across all Capability Modules in a policy. Name collisions are detected at load time (build-time) by flattening all `names` arrays across all modules. Each unique file should only be referenced once.

A local Capability Module can be used to compose a unique selection of capabilities from multiple dependencies.

#### Capability File

The Capability File is read as text (minified in the case of webpack) and evaluated in an isolated Compartment endowed with `repair` and `defineCapability`. One Compartment is created per unique file (not per capability name).

**`repair(callback)`** — Registers a callback to run after `repairIntrinsics()` but before `hardenIntrinsics()`. The callback receives the real top-level `globalThis` and may modify it. It is safe to capture the reference in a higher scope for use in `endow`.

**`defineCapability(name, definition)`** — Registers a named capability. The `name` must be a string matching one of the names declared in the Capability Module. A single file may call `defineCapability` multiple times with different names.

```js
repair((realGlobalThis) => {
  // Runs between repairIntrinsics() and hardenIntrinsics().
  // Make repairs to realGlobalThis here.
  // It's ok to capture realGlobalThis in higher scope.
})

defineCapability('define-to-set', {
  ambient: false, // if true, applies to every compartment automatically
  endow: ({
    options, // array of options from the resource's capabilities entry
    endowments, // the proposed endowments object (after getEndowmentsForConfig)
    compartmentGlobalThis, // the compartment's globalThis
    rootCompartmentGlobalThis, // the root compartment's globalThis
  }) => {
    // Mutate endowments or compartmentGlobalThis in place. No return value.
    // Detect root compartment: rootCompartmentGlobalThis === compartmentGlobalThis
  },
})

defineCapability('endow-symbol-redefine', {
  ambient: false,
  endow: ({
    options,
    endowments,
    compartmentGlobalThis,
    rootCompartmentGlobalThis,
  }) => {
    // This capability shares the repair above with "define-to-set"
    // because they are in the same Capability File.
  },
})
```

### Example use cases

**reasonable-process** — An attenuator for `process` returning a safe version that has all the basic functionality but none of the really dangerous APIs. If a specific dangerous API is meant to be available, its name needs to be listed in the options. Can be applied globally on root or per resource. Could be implemented to endow more powerful `process` to individual resources while the root one is more limited.

**define-to-set** — Puts a new copy of `Object` and `Reflect` references in the compartment where it's used, inheriting all references except for the `defineProperty` method. The replaced implementations use the value or the return value of a getter and assign to globalThis with _set_ semantics. Works the same if first argument is not the compartment globalThis.

**endow-symbol-write** — Creates writable (via getter and setter) symbol key(s).

**endow-symbol-redefine** — A mix of the above two, sharing a repair with define-to-set by co-location in the same Capability File.

**brand-new-name-capability** — Any new global can be custom-made using existing globals and the per-resource options array. In Node.js we could afford synchronously loading builtins for that.

### Bikeshedding and open questions

Naming:

- capability vs power vs cap vs opinions/opinionateds — still undecided. "capability" used as working name throughout.
- All names in how the capability is defined.

Ambient capabilities:

- `ambient: true` applies the capability's `endow` to ALL compartments including root. Capability authors detect root via `rootCompartmentGlobalThis === compartmentGlobalThis` and can opt out of modifying it. A future author guide should document this pattern.

Timing:

- Whether `defineCapability` can be called inside the `repair` callback (instead of at the top level) — depends on implementation details of running repairs in packages/node workspace. If `repair` can execute its callback immediately, this is allowed. Revisit when Phase 1.5 implementation details are clear.

Builtins:

- Should capabilities cover Node.js builtins (fs, net, etc.)? Probably yes, with a separate registration function and different parameters. Planned for Phase 3.

Validation:

- The runtime does NOT validate that `defineCapability` calls match Capability Module declarations. A DX validation tool (Phase 4) will handle checking for undeclared or missing definitions.
- Name collision detection happens at Capability Module load time (build-time), across all modules.

## Implementation plan

Implementation is split into phases. Each phase builds on the previous.

### Phase 1: Core capability infrastructure (packages/webpack and packages/node only)

Non-ambient capabilities working in the webpack plugin. Existing repairs mechanism deprecated but left functional.

**Capability registration API** — New module `packages/core/src/endowmentsToolkit.js`. Exports `evaluateCapabilities(capabilitySourcesByFile, globalRef)` which, for each unique file, creates a Compartment, evaluates the capability code, and collects repair and endow registrations. The `repair` endowment queues callbacks. The `defineCapability` endowment is a single shared function that collects `(name, { ambient, endow })` pairs into a registry. Returns `{ repairs: Function[], capabilities: Map<string, { ambient, endow }> }`.

**Policy schema changes** — Add `use: string[]` at policy top level and `capabilities: Record<string, any[]>` per resource. Update `mergePolicy()` in `packages/core/src/mergePolicy.js` to union `use` arrays and use override-wins for per-resource `capabilities`.

**Build-time capability loading** (`packages/webpack/src/buildtime/`) — After policy is loaded, resolve `use` entries as JS Capability Modules. Each exports an array of `{ names, file }` entries. Flatten all `names` to detect collisions. Read each unique file as source text. Pass capability sources and name→file mapping to the runtime as new fragments (similar to how `repairsBuilder.js` inlines repair sources).

**Runtime capability execution** (`packages/webpack/src/runtime/`) — New runtime fragments: `capabilitySources` (file→source map) and `capabilityNames` (name→file index). In `runtime.js`, between `repairIntrinsics()` and `hardenIntrinsics()` (the existing `LOCKDOWN_SHIMS` gap): evaluate each unique capability file in a fresh Compartment with `repair` and `defineCapability` endowments, then execute all collected repair callbacks with `theRealGlobalThis`. In `installGlobalsForPolicy()`, after `getEndowmentsForConfig()` and existing repairs: for each capability in the resource's `capabilities` field, look up the registered capability and call its `endow` function.

**Deprecate existing repairs** — Add deprecation notices to `repairsBuilder.js` and repair files. Leave fully functional; migration to capabilities is a Phase 4 concern.

**Key files:**

- `packages/core/src/endowmentsToolkit.js` — integration point; `getEndowmentsForConfig` and `copyWrappedGlobals` are where capability endow hooks in after proposed endowments are built
- `packages/core/src/mergePolicy.js` — extend merge logic for `use` and `capabilities`
- `packages/core/src/loadPolicy.js` — may need `use` field handling
- `packages/webpack/src/runtime/runtime.js` — lockdown gap (line ~15-23), `installGlobalsForPolicy` (line ~188)
- `packages/webpack/src/runtime/runtimeBuilder.js` — add capability fragments alongside repairs fragment
- `packages/webpack/src/runtime/repairsBuilder.js` — reference pattern for source inlining
- `packages/webpack/src/runtime/assemble.js` — `assembleRuntime` handles fragment inlining

### Phase 1.5: lavamoat-node support

Capabilities working in lavamoat-node. Browserify gets partial support via the shared `kernelCoreTemplate` but no browserify-specific work is planned.

**Split lockdown** in `packages/core/src/kernelTemplate.js` — change `lockdown()` to `repairIntrinsics()` + capability repairs + `hardenIntrinsics()`.

**Thread capability data into kernel** — `generateKernel()` in `packages/core/src/generateKernel.js` accepts capability source texts and inlines them via the `templateRequire`/`stringReplace` mechanism. The `capabilityRunner` module gets inlined as a new `templateRequire` dependency.

**Hook endow into compartment creation** in `packages/core/src/kernelCoreTemplate.js` — in `getCompartmentForPackage()`, after `getEndowmentsForConfig()` and property descriptor transforms, call capability endow functions for the resource's listed capabilities.

**Update CLIs** — `packages/lavamoat-node/src/kernel.js` and `packages/node/src/cli.js` load Capability Modules from disk and pass sources to `generateKernel`.

### Phase 2: Ambient capabilities

Support `ambient: true` in `defineCapability`. Ambient capabilities have their `endow` called for every compartment (including root) automatically, with an empty options array. Non-ambient capabilities continue to require explicit listing in the resource's `capabilities` field. `endow` callbacks detect root via `rootCompartmentGlobalThis === compartmentGlobalThis`.

### Phase 3: Builtins support

Capabilities can attenuate Node.js builtins. New registration function (e.g. `defineBuiltinCapability`) in the capability API with different parameters than `endow` — receives module namespace, returns attenuated version. Hook into `getBuiltinForConfig` in `endowmentsToolkit.js`.

### Phase 4: DX improvements

- **Capability validation tool** — CLI/build-time tool that evaluates capabilities and checks `defineCapability` calls match Capability Module declarations (undeclared names, missing definitions).
- Warning for unused capabilities (in `use` but never referenced in `capabilities`).
- Validation: referencing a capability not in `use` → clear error.
- Better error messages.
- Optional `resourceName` parameter in `endow` callback (threading canonical name into endowmentsToolkit).
- Capability author guide.
- Migrate existing built-in repairs to capability format (completing deprecation from Phase 1).

### Nice-to-haves

- An input to the `endow` callback containing the canonical name of the compartment/resource. This is not information currently available to endowmentsToolkit and threading it consistently in both lavamoat-node and the webpack plugin might not be worth the complexity. The benefit would be that a debugging tool could report which capabilities are applied to which resources at runtime.
