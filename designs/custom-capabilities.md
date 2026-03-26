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

### Phase 1: Core capability infrastructure (packages/webpack and packages/node)

Non-ambient capabilities working in the webpack plugin and packages/node. Existing repairs mechanism in webpack deprecated but left functional.

#### Common (packages/core)

**`evaluateCapabilities` in `packages/core/src/endowmentsToolkit.js`** — New export `evaluateCapabilities(capabilitySourcesByFile, globalRef)` added to endowmentsToolkit. For each unique file, creates a Compartment, evaluates the capability code, and collects repair and endow registrations. The `repair` endowment queues callbacks. The `defineCapability` endowment is a single shared function that collects `(name, { ambient, endow })` pairs into a registry. Returns `{ repairs: Function[], capabilities: Map<string, { ambient, endow }> }`.

**Capabilities as an `endowmentsToolkit` factory option** — The registered capabilities map (output of `evaluateCapabilities`) is passed to the `endowmentsToolkit()` factory call as a new option alongside the existing `handleGlobalWrite` and `knownWritableFields`. The factory currently returns `{ getEndowmentsForConfig, copyWrappedGlobals, ... }`. With capabilities passed in, these functions gain the ability to call capability `endow` functions internally. All capability `endow` invocation happens exclusively within endowmentsToolkit — no caller should ever call `endow` directly. At factory initialization time, the factory splits the capabilities into two collections — ambient (applied to every compartment) and local (applied only when listed in `packagePolicy.capabilities`) — so that `getEndowmentsForConfig` and `copyWrappedGlobals` never need to filter on every call.

Inside `getEndowmentsForConfig(sourceRef, packagePolicy, unwrapTo, unwrapFrom)`, after building the proposed endowments object, the function iterates the `packagePolicy.capabilities` entries. For each capability name listed, it looks up the registered capability and calls its `endow({ options, endowments, compartmentGlobalThis: unwrapFrom, rootCompartmentGlobalThis: sourceRef })`. Similarly, `copyWrappedGlobals` (used for the root compartment) applies capabilities listed for `$root$`.

**Encapsulation principle** — `endowmentsToolkit.js` is the only module that understands the internal structure of the definition object passed to `defineCapability` (i.e. `{ ambient, endow }`). All other layers — policy converter, attenuator, runtime, kernel — treat registered capabilities as opaque values. They pass them through but never inspect or call `endow` or read `ambient` themselves. This keeps the capability definition contract in a single place and allows its shape to evolve without cascading changes across runtimes.

**Policy schema changes** — Add `use: string[]` at policy top level and `capabilities: Record<string, any[]>` per resource. Update `mergePolicy()` in `packages/core/src/mergePolicy.js` to union `use` arrays and use override-wins for per-resource `capabilities`.

Key files:

- `packages/core/src/endowmentsToolkit.js` — `evaluateCapabilities` export; factory accepts `capabilities` option; `getEndowmentsForConfig` and `copyWrappedGlobals` call `endow` internally
- `packages/core/src/mergePolicy.js` — extend merge logic for `use` and `capabilities`
- `packages/core/src/loadPolicy.js` — may need `use` field handling

#### packages/webpack

**Build-time capability loading** (`packages/webpack/src/buildtime/`) — After policy is loaded, resolve `use` entries as JS Capability Modules. Each exports an array of `{ names, file }` entries. Flatten all `names` to detect collisions. Read each unique file as source text. Pass capability sources and name→file mapping to the runtime as new fragments (similar to how `repairsBuilder.js` inlines repair sources).

**Runtime capability execution** (`packages/webpack/src/runtime/`) — New runtime fragments: `capabilitySources` (file→source map) and `capabilityNames` (name→file index). In `runtime.js`, between `repairIntrinsics()` and `hardenIntrinsics()` (the existing `LOCKDOWN_SHIMS` gap): call `evaluateCapabilities` on the inlined sources, then execute all collected repair callbacks with `theRealGlobalThis`. Pass the resulting capabilities map to the `endowmentsToolkit()` factory call (line ~63, where `endowmentsToolkit({ handleGlobalWrite, knownWritableFields })` is currently called). The toolkit's `getEndowmentsForConfig` and `copyWrappedGlobals` then handle calling `endow` internally based on per-resource policy. No changes needed in `installGlobalsForPolicy()` beyond ensuring `packagePolicy` includes the `capabilities` field (which it will, since it comes from `LAVAMOAT.policy.resources`).

**Deprecate existing repairs** — Add deprecation notices to `repairsBuilder.js` and repair files. Leave fully functional; migration to capabilities is a Phase 4 concern.

Key files:

- `packages/webpack/src/runtime/runtime.js` — lockdown gap (line ~15-23) for `evaluateCapabilities` + repairs; toolkit factory call (line ~63) receives capabilities
- `packages/webpack/src/runtime/runtimeBuilder.js` — add capability fragments alongside repairs fragment
- `packages/webpack/src/runtime/repairsBuilder.js` — reference pattern for source inlining
- `packages/webpack/src/runtime/assemble.js` — `assembleRuntime` handles fragment inlining

#### packages/node

packages/node uses Endo's compartment mapper — it does NOT use `generateKernel` or `kernelCoreTemplate`. The architecture is fundamentally different from packages/webpack: compartments are created by Endo's `loadFromMap()`, and globals are assigned via an _attenuator_ pattern (`default-attenuator.js`) rather than a kernel-managed process. The attenuator is passed as an exit module and called by Endo once per compartment.

**Split lockdown** in `packages/node/src/preamble.js` — change the single `lockdown()` call to `repairIntrinsics()` + capability repairs + `hardenIntrinsics()`. Currently `preamble.js` is a bare side-effect import (`import './preamble.js'`); it will need to accept or import the capability sources to evaluate and run repairs between the two lockdown phases. This may require refactoring the preamble into a function that accepts capability data, or importing a setup module that performs the split lockdown with repairs.

**Capability loading in `packages/node/src/exec/run.js`** — The `run()` function currently:

1. Loads policy via `loadPolicies()` (line ~68)
2. Converts to Endo policy via `toEndoPolicy()` (line ~71)
3. Creates attenuators via `makeAttenuators()` (line ~76)
4. Calls `execute()` (line ~103)

At step 1, after loading the merged policy, resolve the `use` entries as Capability Modules, read capability file sources, and call `evaluateCapabilities()` to get the registered capabilities. The repair callbacks must have already run before any compartments are created (so before step 4), which ties back to the preamble split. Pass the registered capabilities map to `makeAttenuators()` at step 3.

**Threading capabilities through the attenuator into endowmentsToolkit** — `makeAttenuators()` in `packages/node/src/exec/default-attenuator.js` currently calls `endowmentsToolkit({ handleGlobalWrite, knownWritableFields })` (line ~75). The registered capabilities map gets passed through here as a new factory option: `endowmentsToolkit({ handleGlobalWrite, knownWritableFields, capabilities })`. From this point, `getEndowmentsForConfig` handles `endow` calls internally — the attenuator doesn't call `endow` directly.

However, `getEndowmentsForConfig` needs the per-resource `capabilities` data in its `packagePolicy` argument. Currently the attenuator constructs a synthetic `ResourcePolicy` as `{ globals: policy }` (line ~155) where `policy` comes from the Endo attenuator params. To include capabilities data, the Endo attenuator params must carry both globals and capabilities for each resource.

**Policy converter changes** — `convertToEndoPackagePolicyGlobals()` in `packages/node/src/policy-converter.js` (line ~170) currently wraps the globals as `[item]` (a single-element array), which becomes the attenuator's `params[0]`. Extend this to pass both globals and capabilities: either restructure `params[0]` from a bare `GlobalPolicy` to `{ globals, capabilities }`, or add `capabilities` as `params[1]`. The attenuator then destructures both and constructs the `packagePolicy` as `{ globals, capabilities }` for `getEndowmentsForConfig`. This keeps capability `endow` invocation entirely within endowmentsToolkit.

Refactoring needed:

- `packages/node/src/policy-converter.js` `convertToEndoPackagePolicyGlobals()` (line ~170) — include capabilities data in the attenuator params alongside the globals policy
- `packages/node/src/exec/default-attenuator.js` `makeAttenuators()` (line ~52) — accept registered capabilities, pass to `endowmentsToolkit()` factory call
- `packages/node/src/exec/default-attenuator.js` `attenuateGlobals()` (line ~108) — destructure capabilities from params, construct `{ globals, capabilities }` for `getEndowmentsForConfig`
- `packages/node/src/exec/run.js` `run()` — load capability modules, run `evaluateCapabilities`, pass results to `makeAttenuators()`
- `packages/node/src/preamble.js` — split `lockdown()` into `repairIntrinsics()` + `hardenIntrinsics()` with a gap for capability repairs
- `packages/node/src/types.ts` — extend `GlobalAttenuatorParams` type to include capabilities data

Key files:

- `packages/node/src/preamble.js` — lockdown split (currently line ~10, single `lockdown()` call)
- `packages/node/src/exec/run.js` — capability loading + threading (line ~68-103)
- `packages/node/src/exec/default-attenuator.js` — `makeAttenuators()` (line ~52): passes capabilities to `endowmentsToolkit()` factory; `attenuateGlobals()` (line ~108): threads capabilities into `packagePolicy` for toolkit
- `packages/node/src/policy-converter.js` — `convertToEndoPackagePolicyGlobals()` (line ~170): include capabilities in Endo attenuator params
- `packages/node/src/types.ts` — `GlobalAttenuatorParams` type

### Phase 1.5: packages/lavamoat-node support

Capabilities working in packages/lavamoat-node. Browserify gets partial support via the shared `kernelCoreTemplate` but no browserify-specific work is planned.

**Split lockdown** in `packages/core/src/kernelTemplate.js` — change `lockdown()` to `repairIntrinsics()` + capability repairs + `hardenIntrinsics()`.

**Thread capability data into kernel** — `generateKernel()` in `packages/core/src/generateKernel.js` accepts capability source texts and inlines them via the `templateRequire`/`stringReplace` mechanism. The `evaluateCapabilities` function from endowmentsToolkit gets inlined as a new `templateRequire` dependency (or extracted into a standalone module that both endowmentsToolkit and the kernel template can use).

**Pass capabilities to endowmentsToolkit factory** in `packages/core/src/kernelCoreTemplate.js` — the `endowmentsToolkit()` factory call receives the capabilities map. `getEndowmentsForConfig` and `copyWrappedGlobals` then handle `endow` calls internally based on the `packagePolicy.capabilities` field, which is already present in the policy passed to `getCompartmentForPackage()`.

**Update CLI** — `packages/lavamoat-node/src/kernel.js` loads Capability Modules from disk and passes sources to `generateKernel`.

Key files:

- `packages/core/src/kernelTemplate.js` — lockdown split (line ~66)
- `packages/core/src/kernelCoreTemplate.js` — toolkit factory call receives capabilities; compartment creation unchanged since toolkit handles `endow` internally
- `packages/core/src/generateKernel.js` — kernel assembly, templateRequire mechanism
- `packages/lavamoat-node/src/kernel.js` — kernel creation entry point

### Phase 2: Ambient capabilities

Support `ambient: true` in `defineCapability`. Ambient capabilities have their `endow` called for every compartment (including root) automatically, with an empty options array. Non-ambient capabilities continue to require explicit listing in the resource's `capabilities` field. `endow` callbacks detect root via `rootCompartmentGlobalThis === compartmentGlobalThis`.

### Phase 3: Builtins support

Capabilities can attenuate Node.js builtins. New registration function (e.g. `defineBuiltinCapability`) in the capability API with different parameters than `endow` — receives module namespace, returns attenuated version. Hook into `getBuiltinForConfig` in `endowmentsToolkit.js`. In packages/node, hook into `attenuateModule` in `default-attenuator.js`.

### Phase 4: DX improvements

- **Capability validation tool** — CLI/build-time tool that evaluates capabilities and checks `defineCapability` calls match Capability Module declarations (undeclared names, missing definitions).
- Warning for unused capabilities (in `use` but never referenced in `capabilities`).
- Validation: referencing a capability not in `use` → clear error.
- Better error messages.
- Optional `resourceName` parameter in `endow` callback (threading canonical name into endowmentsToolkit).
- Capability author guide.
- Migrate existing built-in repairs to capability format (completing deprecation from Phase 1).

### Not implemented

- An input to the `endow` callback containing the canonical name of the compartment/resource. This would let capability authors log, warn, or customize behavior per-resource. Analysis of the full chain from where the name is known to where `endow` is called:

  **packages/webpack** — Feasible without changes outside LavaMoat. `installGlobalsForPolicy(resourceId, packageCompartmentGlobal)` in `runtime.js` (line ~179) already receives `resourceId` as its first argument. It calls `getEndowmentsForConfig(rootCompartmentGlobalThis, packagePolicy, globalThis, packageCompartmentGlobal)`. Adding `resourceId` as a fifth argument (or as a field on `packagePolicy`) to reach `endow` inside the toolkit is straightforward. For root, `copyWrappedGlobals` is called from the same function where `resourceId === LAVAMOAT.root` is known, so the name can be passed similarly.

  **packages/node** — NOT feasible without Endo changes. The chain breaks inside Endo:
  1. `link.js:385` — Endo calls its internal `attenuateGlobals(compartment.globalThis, globals, compartmentDescriptor.policy, attenuators, pendingJobs, compartmentDescriptor.name)` — **name is available here**.
  2. `policy.js:336` — For LavaMoat's array-style globals (which `isAttenuationDefinition` matches), Endo enters the attenuation path and calls `attenuateGlobalThis({attenuators, attenuationDefinition, globalThis, globals})` — **name is NOT forwarded**.
  3. `policy.js:282-301` — `importAttenuatorForDefinition` extracts `params` from the definition, binds them, and calls `attenuate(globals, globalThis)`.
  4. LavaMoat's `default-attenuator.js:100` — receives `([policy], originalGlobalThis, packageCompartmentGlobalThis)` — **no name argument**.

  The `name` exists in Endo's scope (step 1) but is dropped at step 2. It would need to be threaded through `attenuateGlobalThis` and into the bound attenuator call, which means changing `GlobalAttenuatorFn` signature or the `attenuateGlobalThis` internal. Both are Endo changes.

  **packages/lavamoat-node** — Feasible. `getCompartmentForPackage()` in `kernelCoreTemplate.js` already knows the resource name and calls `getEndowmentsForConfig` directly. Same approach as webpack: pass the name as an additional argument or field.

  **Conclusion**: webpack and lavamoat-node can pass the canonical name to `endow` with minimal plumbing. packages/node cannot without an Endo change to forward `compartmentDescriptor.name` through the attenuation path to the user-supplied attenuator function. Since the encapsulation principle places all `endow` calls in `endowmentsToolkit`, the toolkit's `getEndowmentsForConfig` and `copyWrappedGlobals` would need a new optional parameter (e.g. `resourceName`) that each caller provides where available. In packages/node this parameter would be `undefined` until Endo is updated.
