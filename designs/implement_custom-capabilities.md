# Implementation tasks: Custom capabilities

Implementation tasks for [custom-capabilities.md](./custom-capabilities.md) Phase 1.

Tasks are ordered for a TDD approach: write tests first, implement to pass, then integrate into the next layer.

## Task dependency order

```
1.1 evaluateCapabilities
 └─► 1.2 endowmentsToolkit capabilities option
      ├─► 1.5 webpack runtime integration ◄── 1.4 webpack build-time loading
      │    └─► 1.6 deprecate repairs
      └─► 1.9 attenuator → endowmentsToolkit ◄── 1.8 policy converter
           └─► 1.10 run() wiring ◄── 1.7 split preamble
1.3 mergePolicy (independent, needed before 1.4, 1.8, and 1.10)
```

## Task 1.1: `evaluateCapabilities` in packages/core

Write tests, then implement `evaluateCapabilities(capabilitySourcesByFile, globalRef)` as a new export in `packages/core/src/endowmentsToolkit.js`. For each unique file, creates a Compartment endowed with `repair` and `defineCapability`, evaluates the source, and collects registrations. Returns `{ repairs: Function[], capabilities: Map<string, { ambient, endow }> }`.

Test cases:

- Single file, single `defineCapability` call → capability registered in map.
- Single file, multiple `defineCapability` calls → all registered.
- `repair` callback collected in `repairs` array.
- `repair` callback receives `globalRef` when executed.
- Duplicate capability name across files → error.
- `defineCapability` with unknown name (not declared in any module) — no error here (validation is Phase 4).
- Empty `capabilitySourcesByFile` → empty results.
- Capability source throws at evaluation time → error with context.

Files: `packages/core/src/endowmentsToolkit.js`, `packages/core/test/endowmentsToolkit.spec.js` (or colocated test file).

### Review comments

endowmentsToolkit.js

- there's no point in evaluateCapabilities knowing the file paths, accept an array of sources.
- evaluateCapabilities should use an option bag of named arguments
- add an argument called `globals` and pass that as additional globals to Compartment

## Task 1.2: `endowmentsToolkit` factory accepts `capabilities` option

Write tests, then extend the `endowmentsToolkit()` factory to accept a `capabilities` option (the map from Task 1.1). At factory init time, split into ambient and local collections. Extend `getEndowmentsForConfig` to call `endow` for each capability listed in `packagePolicy.capabilities`, after building the endowments object. Extend `copyWrappedGlobals` to apply capabilities listed for `$root$`.

Test cases:

- Factory called without `capabilities` → existing behavior unchanged (backwards compat).
- `getEndowmentsForConfig` with `packagePolicy.capabilities` containing a registered name → `endow` called with `{ options, endowments, compartmentGlobalThis, rootCompartmentGlobalThis }`.
- `getEndowmentsForConfig` with `packagePolicy.capabilities` containing an unknown name → error.
- `endow` can mutate the `endowments` object (e.g. replace a property) and the mutation is visible in the returned result.
- `endow` receives the correct `options` array from `packagePolicy.capabilities[name]`.
- `copyWrappedGlobals` with root capabilities → `endow` called.
- Ambient capabilities NOT applied yet (Phase 2) — verify they are separated but not invoked.
- Multiple capabilities applied in order of listing.

Encapsulation: verify that the `capabilities` map is consumed solely within endowmentsToolkit — no fields of individual capability definitions are read outside.

Files: `packages/core/src/endowmentsToolkit.js`, existing and new tests.

## Task 1.3: Policy schema — `mergePolicy` and `loadPolicy`

Write tests, then extend `mergePolicy()` in `packages/core/src/mergePolicy.js` to handle `use` (top-level `string[]`, merged via union) and per-resource `capabilities` (`Record<string, any[]>`, override-wins). Update `loadPolicy` if needed to preserve/validate these fields.

Test cases:

- Merge two policies with disjoint `use` arrays → union.
- Merge two policies with overlapping `use` arrays → deduplicated union.
- Merge policy with `use` and policy without → `use` preserved.
- Merge per-resource `capabilities` — override policy wins.
- Override policy adds capabilities to a resource that had none.
- Override policy removes all capabilities from a resource (empty object).
- Round-trip: load → merge override → result has correct `use` and `capabilities`.

Files: `packages/core/src/mergePolicy.js`, `packages/core/test/mergePolicy.spec.js` (or colocated), possibly `packages/core/src/loadPolicy.js`.

## Task 1.4: Webpack build-time — Capability Module loading

Write tests, then implement build-time resolution of `use` entries in the webpack plugin. Each entry is a JS Capability Module (a package or local path). Each module exports an array of `{ names: string[], file: string }`. Flatten all `names` to detect collisions. Read each unique `file` as source text. Produce two runtime fragments: `capabilitySources` (file→source map) and `capabilityNames` (name→file index).

Test cases:

- Single Capability Module with one file → fragments generated.
- Multiple Capability Modules → all files collected, names flattened.
- Name collision across modules → build error.
- Missing file referenced by module → build error.
- Module with no exports / wrong shape → build error.
- No `use` in policy → no capability fragments emitted, runtime unchanged.

Files: new file(s) in `packages/webpack/src/buildtime/`, `packages/webpack/src/runtime/runtimeBuilder.js` (add fragments), pattern reference: `packages/webpack/src/runtime/repairsBuilder.js`.

## Task 1.5: Webpack runtime — capability evaluation and endow integration

Write tests (may require integration-level tests using the webpack plugin build output), then implement runtime evaluation. In `runtime.js`, in the `LOCKDOWN_SHIMS` gap between `repairIntrinsics()` and `hardenIntrinsics()`: call `evaluateCapabilities` on the inlined sources, execute collected repair callbacks with `theRealGlobalThis`, pass resulting capabilities map to `endowmentsToolkit()` factory call (line ~63).

Test cases:

- E2E: build with a policy that has `use` and per-resource `capabilities` → resource compartment receives endowments modified by capability `endow`.
- E2E: capability `repair` callback runs before `hardenIntrinsics()` and its mutations persist.
- E2E: capability `endow` only runs for resources that list the capability, not others.
- Backwards compat: build without `use` in policy → existing repairs and endowments work unchanged.
- Existing repairs and capabilities coexist (both run for a resource that uses both).

Files: `packages/webpack/src/runtime/runtime.js` (lockdown gap + factory call), `packages/webpack/src/runtime/runtimeBuilder.js`, `packages/webpack/src/runtime/assemble.js`.

## Task 1.6: Webpack — deprecate existing repairs

Add deprecation notices to `repairsBuilder.js` and repair files. No behavioral change. Existing repairs remain fully functional; migration to capabilities is Phase 4.

Files: `packages/webpack/src/runtime/repairsBuilder.js`, repair source files.

## Task 1.7: packages/node — split lockdown in preamble

Write tests, then refactor `packages/node/src/preamble.js` to split the single `lockdown()` call into `repairIntrinsics()` + `hardenIntrinsics()` with a gap between them. The gap is initially empty — capability repairs will be inserted in Task 1.10. The preamble currently runs as a bare side-effect import; it may need to become a function that accepts a callback to run between the two phases, or export a two-step API.

Test cases:

- After preamble runs, SES protections are in place (same as before).
- `repairIntrinsics()` runs before `hardenIntrinsics()` (verify via intrinsics state if possible, or by injecting a callback that mutates a global — mutation persists after `hardenIntrinsics`).
- Existing packages/node tests still pass (no regression).

Files: `packages/node/src/preamble.js`, existing tests.

## Task 1.8: packages/node — policy converter threads capabilities

Write tests, then extend `convertToEndoPackagePolicyGlobals()` in `packages/node/src/policy-converter.js` (line ~170) to include capabilities data in the attenuator params alongside globals. Currently wraps globals as `[item]`. Change to include capabilities: either restructure `params[0]` to `{ globals, capabilities }` or add `params[1]`. Update `GlobalAttenuatorParams` type in `packages/node/src/types.ts`.

Test cases:

- Resource with globals only → params structure includes globals, capabilities is empty/undefined.
- Resource with globals and capabilities → both present in params.
- Resource with capabilities but no globals → capabilities still threaded.
- `toEndoPolicy()` round-trip: LavaMoat policy with `capabilities` → Endo policy → attenuator params contain capabilities data.
- Root policy item → capabilities for `$root$` if any.
- Backwards compat: policy without `capabilities` field → existing params shape works.

Files: `packages/node/src/policy-converter.js`, `packages/node/src/types.ts`, `packages/node/test/` (converter tests).

## Task 1.9: packages/node — attenuator receives capabilities and passes to endowmentsToolkit

Write tests, then extend `makeAttenuators()` in `packages/node/src/exec/default-attenuator.js` to accept the registered capabilities map and pass it to `endowmentsToolkit()` factory call (line ~75). Update `attenuateGlobals()` to destructure capabilities from the Endo attenuator params (from Task 1.8) and construct `{ globals, capabilities }` as the `packagePolicy` for `getEndowmentsForConfig`.

Test cases:

- `makeAttenuators()` called without capabilities → backwards compat, existing behavior.
- `makeAttenuators()` called with capabilities → `endowmentsToolkit` receives them.
- `attenuateGlobals()` with capabilities in params → `getEndowmentsForConfig` receives `packagePolicy` with `capabilities` field.
- `attenuateGlobals()` without capabilities in params → `packagePolicy` has only `globals`, no error.
- Root attenuation: `copyWrappedGlobals` receives capabilities for `$root$`.

Files: `packages/node/src/exec/default-attenuator.js`, tests for attenuator.

## Task 1.10: packages/node — capability loading and wiring in run()

Write integration tests, then wire everything together in `packages/node/src/exec/run.js`. After `loadPolicies()` (line ~68), resolve `use` entries as Capability Modules, read file sources, call `evaluateCapabilities()`. Run repair callbacks (requires preamble gap from Task 1.7). Pass capabilities map to `makeAttenuators()` (Task 1.9). Pass through to `toEndoPolicy()` conversion (Task 1.8).

Test cases:

- E2E: run a script with a policy that has `use` and per-resource `capabilities` → resource compartment sees endowments modified by `endow`.
- E2E: `repair` callback mutations visible to all compartments.
- E2E: capability only applied to resources that list it.
- Backwards compat: `run()` without `use` in policy → existing behavior unchanged.
- Missing Capability Module in `use` → clear error at load time.

Files: `packages/node/src/exec/run.js`, integration tests.
