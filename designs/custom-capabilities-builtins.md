<!-- markdownlint-disable MD033 -->

# Custom Capabilities for Node.js Builtins

Extends [the Custom Capabilities design (`custom-capabilities.md`)][custom-capabilities] document, covering capabilities which shape a Compartment's globals. This one lets a capability also replace or attenuate _builtin_ modules, such as `fs` in Node.js.

It supersedes [Phase 3: Builtins support](./custom-capabilities.md#phase-3-builtins-support) section and the "Builtins" [open question](./custom-capabilities.md#bikeshedding-and-open-questions) in that document.

**This is a design document; not an implementation plan.** It is expected to be implemented no less than twice: in [`@lavamoat/node`](../packages/node/README.md) and in [`@lavamoat/webpack`](../packages/webpack/README.md). The host-specific sections at the end record the constraints each implementation must respect.

## Summary

- A capability definition gains an optional `builtins` list: the names of the builtins it **claims**.
- The capability's existing `endow` callback receives a copy of each claimed builtin, and assigns the module the Compartment will get instead. One callback handles a Compartment's globals and builtins together.
- `endow` never receives a real builtin. Real builtins, like the real `globalThis`, belong to `repair`.
- Policy does not change shape. A resource opts in through the existing `capabilities` field, with the existing options form.
- Listing a capability _grants_ the builtins it claims. A `builtin` policy entry for the same builtin in the same resource is a contradiction and a fatal error.
- When Policy Overrides are merged into Policy, a builtin claimed by an override capability removes the matching generated `builtin` entries, so the contradiction does not arise from ordinary use.
- A listed capability affects only the Compartment which lists it. An **ambient** capability replaces its builtins in every Compartment and grants nothing: `builtin` Policy still decides who may import them.

## Terminology

> See [`custom-capabilities.md`'s Terminology section](./custom-capabilities.md#terminology) for the definition of "Capability" and "Compartment".

<dd>

<dl>
  <dt>

Builtin

  </dt>
  <dd>

A module provided by the platform rather than by a package. In `@lavamoat/node`, a Node.js built-in module. In `@lavamoat/webpack`, an external which the plugin treats as a builtin (or an actual Node.js builtin for bundles targeting Node.js). In the context of Custom Capabilities, a Builtin can be overridden by a Custom Capability's implementation.

  </dd>
  <dt>

Real Builtin

  </dt>
  <dd>

The module object the platform provides, before LavaMoat does anything to it.

  </dd>
  <dt>Claim</dt>
  <dd>

A capability _claims_ each name in its `builtins` list. A name is a module specifier, matched exactly: `fs` and `node:fs` are two names.

  </dd>
  <dt>

Listed Capability

  </dt>
  <dd>

One named in a resource's `capabilities` (`CapabilitiesPolicy`). Never ambient.

  </dd>
  <dt>

Ambient capability

  </dt>
  <dd>

One defined with `ambient: true`. It applies to every Compartment and is never listed.

  </dd>
  <dt>

Platform Builtin (`platformBuiltins`)

  </dt>
  <dd>

What the Capability's `endow` callback receives. a copy of the real builtin, or the result of an Ambient Capability which claimed the same name.

  </dd>
</dl>

## Using Builtin Capabilities in Policy

Nothing new appears in the Policy schema. `use` selects Capability Modules and `capabilities` applies them, exactly as before:

```js
{
  "use": ["./caps/index.js"],
  "resources": {
    "some>package": {
      "capabilities": {
        "fs-allowlist": ["./data", "/etc/ssl/certs"] // may read only below these paths
      },
      "builtin": {
        "path": true // fine: "fs-allowlist" does not claim "path"
        // "fs.readFile": true  <-- fatal error: "fs-allowlist" claims "fs"
      }
    }
  }
}
```

The rules:

1. **Listing is a grant.** If `fs-allowlist` claims `fs` and `node:fs`, then `some>package` above may import both, though neither appears under `builtin`. It receives what the capability assigned, and nothing else of `fs`.
2. **A listed claim is exclusive.** Within one resource, a name claimed by a listed capability must not appear under `builtin` in any form (see [Conflicts](#conflicts)), and at most one listed capability may claim it.
3. **Names are exact.** A claim on `fs` says nothing about `node:fs`. See [Why names are exact](#why-names-are-exact).
4. **Options keep their form.** The value is an array of options, possibly empty. A value of `false` disables the capability for that resource: it claims and grants nothing. `capabilities: false` likewise.
5. **Listing affects one Compartment.** A capability listed on a resource changes builtins for that resource alone. This holds for the root too. To reach every Compartment, use an ambient capability.
6. **An ambient capability grants nothing.** Nobody listed it, so nobody decided to give anything away. It changes what a builtin _is_; `builtin` Policy decides, as it always has, who may import it. See [Ambient capabilities](#ambient-capabilities).

## Defining Builtin Capabilities

The Capability Module (the `{ names, file }` manifest) is unchanged. The definition passed to `defineCapability` gains `builtins`, and `endow` gains three parameters:

```js
const makeGuardedFs = (fs, path, roots) => {
  const allowed = roots.map((root) => path.resolve(String(root)))
  const check = (file) => {
    const resolved = path.resolve(String(file))
    if (
      !allowed.some(
        (root) => resolved === root || resolved.startsWith(root + path.sep)
      )
    ) {
      throw new Error(`fs-allowlist: reading ${resolved} is not allowed`)
    }
    return resolved
  }
  // Illustrative only: a real implementation must also handle URLs, Buffers,
  // file descriptors and symlinks.
  return {
    readFileSync: (file, opts) => fs.readFileSync(check(file), opts),
    readFile: (file, ...rest) => fs.readFile(check(file), ...rest),
  }
}

defineCapability('fs-allowlist', {
  ambient: false,
  builtins: ['fs', 'node:fs'],
  endow({ options, platformBuiltins, builtins, require }) {
    const guarded = makeGuardedFs(
      platformBuiltins.fs,
      require('node:path'),
      options
    )
    builtins.fs = guarded
    builtins['node:fs'] = guarded
  },
})
```

Because one callback sees the Compartment's globals and builtins together, it can keep them consistent. This capability prefixes `console.log` whether the package uses the global or imports the module, and preserves `require('console') === console`:

```js
defineCapability('prefix-log', {
  ambient: false,
  builtins: ['console', 'node:console'],
  endow({ options, compartmentGlobalThis, platformBuiltins, builtins }) {
    const base = compartmentGlobalThis.console || platformBuiltins.console
    const prefixed = Object.assign(Object.create(null), base, {
      log: (...args) => base.log(options[0] || '[cap]', ...args),
    })
    compartmentGlobalThis.console =
      builtins.console =
      builtins['node:console'] =
        prefixed
  },
})
```

Capabilities also compose across authors. `endow` callbacks run in the order the resource lists them, so a capability which claims `console` can build on what an earlier, globals-only capability left in `compartmentGlobalThis.console`.

Because `platformBuiltins` holds copies, a library which patches in place can be pointed at one:

```js
defineCapability('graceful-fs', {
  ambient: false,
  builtins: ['fs', 'node:fs'],
  endow({ platformBuiltins, builtins, require }) {
    const fs = require('graceful-fs').gracefulify(platformBuiltins.fs)
    builtins.fs = builtins['node:fs'] = fs
  },
})
```

### `repair` Acts on the Real Thing; `endow` Acts on Copies

This is the division between the two callbacks, and builtins follow it as globals do.

|                | `repair`                                   | `endow`                                               |
| -------------- | ------------------------------------------ | ----------------------------------------------------- |
| Runs           | Once per process, before intrinsics harden | Once per Compartment the capability applies to        |
| Globals        | The real `globalThis`                      | The Compartment's proposed endowments                 |
| Builtins       | The real builtins, reached with `require`  | A copy of each claimed builtin, in `platformBuiltins` |
| Who is changed | Everyone, LavaMoat and Endo included       | One Compartment                                       |

A capability should not alter the builtins LavaMoat itself runs on unless it means to. To patch `fs` for the whole process, say so with a repair:

```js
repair((realGlobalThis, { require }) => {
  require('graceful-fs').gracefulify(require('node:fs'))
})
```

### The `builtins` List

- **Entries are claims.** Each entry is the exact specifier of one builtin. A duplicate entry is an error at registration.
- **Claims are static.** The list is fixed when `defineCapability` returns. A capability receives no builtin it did not claim, and cannot replace one, so it cannot touch a builtin without saying so up front.
- **Every spelling is a separate claim.** `fs`, `node:fs` and `fs/promises` are three names. A capability which restricts `fs` almost certainly wants all three. Nothing enforces this; see [Security considerations](#security-considerations).

### Why Names Are Exact

An earlier draft let a claim on `fs` cover `node:fs`. It no longer does, for two reasons.

Policy is already exact. `builtin` policy (`BuiltinPolicy`) needs an entry for each spelling a package imports, and claims replace `builtin` entries, so they should read the same way.

More important, a bare name need not be a builtin. `require('fs')` can resolve to a dependency named `fs`, which is common under webpack, where builtins are often polyfilled by packages. `node:fs` can never be a package. Folding the two names into one would make a capability claim something its author did not mean.

### What `endow` Receives and Must Do

| Parameter          | Description                                                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------- |
| `platformBuiltins` | The Platform Builtin for each claimed name, keyed by name. Empty when the capability claims nothing. |
| `builtins`         | The builtins this Compartment will receive, keyed by name. Starts empty; `endow` assigns into it.    |
| `require`          | Loads a module, resolving from the Capability File. `undefined` where the host provides none.        |

The other parameters (`options`, `endowments`, `compartmentGlobalThis`, `rootCompartmentGlobalThis`) are unchanged. `endow` still returns nothing.

- **`builtins` is a proposal, like `endowments`.** `endow` edits it in place. Each value must be an object or a function (some builtins, such as `events`, are functions).
- **Every claim must be assigned.** When `endow` returns, a claimed name missing from `builtins` is a fatal error. `builtins` starts empty rather than pre-filled so that a forgotten assignment, such as the second spelling of a name, cannot silently hand over the whole builtin. To hand it over on purpose, say so: `builtins.fs = platformBuiltins.fs`.
- **Nothing else may be assigned.** A name in `builtins` which the capability did not claim is a fatal error.
- **Claimed builtins load eagerly.** `endow` runs once per Compartment, before any module in it executes, so the host loads and copies each claimed builtin then, whether or not the package ever imports it. If the host cannot load a claimed name as a builtin, that is a fatal error.
- **The value is the module.** CommonJS `require` returns it. For ES modules it is the default export, and its own enumerable properties are the named exports, subject to host limits (see [`@lavamoat/node`](#lavamoatnode)).
- **A disabled capability claims nothing.** Where `endow` is invoked with `options: false`, as it is today, `platformBuiltins` is empty and `builtins` must stay empty.

### What a Platform Builtin Is

Unless an ambient capability claimed the same name (see below), a Platform Builtin is a copy of the real one, made for this Compartment and this call. The capability may patch it, wrap it, pick from it or discard it.

- **The copy is one level deep.** It is a new object with the real builtin's prototype and its own properties, copied by descriptor. A builtin which is a function is copied with the toolkit's function wrapper: callable, constructible, with the same `prototype` and the same static properties.
- **Names which the platform resolves to one module share one copy.** `platformBuiltins.fs === platformBuiltins['node:fs']`.
- **Copies are made only where needed**: for claimed names, in compartments a claiming capability applies to. Nothing else is copied.
- **What the copy holds is still real.** `platformBuiltins.fs.readFile` and `platformBuiltins.fs.promises` are the platform's own function and object, shared with everyone. Replace them on the copy; do not alter them.
- **Assigning to a copy changes only the copy.** A configuration knob which is a plain data property, such as `tls.DEFAULT_MIN_VERSION`, has no effect when set on a copy. One backed by an accessor, such as `events.defaultMaxListeners`, still reaches the platform.
- **A stateful instance copies badly.** `process` is an event emitter. A listener added through a copy fires, but the copy's bookkeeping drifts from the real object's. For such builtins, build the replacement from parts; do not use the copy as the thing itself.

These behaviours were checked by experiment against `fs`, `events`, `tls`, `process` and `console`. Function-valued builtins subclass and pass `instanceof` correctly through the existing wrapper. Builtins mostly lack the `this` problem which globals have, since their functions are written to be called detached.

### Ambient Capabilities

An ambient capability applies to every Compartment, the root included, without being listed. Its `endow` receives an empty options array, as [`custom-capabilities.md`][custom-capabilities] specifies.

For builtins, ambient means _replace_, not _grant_:

- In every Compartment, each name the capability claims is replaced by what its `endow` assigns.
- `builtin` policy (`BuiltinPolicy`) then applies to the replacement. A resource with `"fs": true` receives the whole replacement. One with `"fs.readFile": true` receives that property of it. One with no entry for `fs` may not import it, as before.
- The conflict and pruning rules do not apply. They concern listed capabilities, and an ambient capability is never listed.

An ambient capability and a listed one may claim the same name. The ambient one runs first, and its result becomes the listed one's Platform Builtin. So with an ambient `graceful-fs`, a resource which lists `fs-allowlist` gets an allowlist built over graceful `fs`.

Two ambient capabilities must not claim the same name. That is a fatal error.

Making `graceful-fs` above ambient is a one-word change, and gives every package which may import `fs` the graceful one, each on its own copy.

The `ambient` flag has no effect today, for globals or anything else; ambient capabilities are [Phase 2 of `custom-capabilities.md`](./custom-capabilities.md#phase-2-ambient-capabilities). This section says what ambient means for builtins once that exists.

### Loading Modules from a Capability File

A Capability File is not a module. It is source text evaluated as a function body with `repair` and `defineCapability` in scope. It therefore has no `require` of its own, static `import` is a syntax error, and `import()` is asynchronous and resolves relative to LavaMoat's own files.

A host may instead pass a `require` function to both callbacks: to `endow` among its parameters, and to a `repair` callback as a property of its second argument. `@lavamoat/node` does.

- **It must resolve from the Capability File itself**: not from the Policy file, the working directory, the application, or LavaMoat. A capability published in a package then finds that package's own dependencies.
- **It is a parameter, not a variable in scope.** A Capability File therefore cannot load a module while it is being evaluated, only once a callback runs.
- **It returns real modules.** `require('node:fs')` is the real `fs`. In `repair` that is the point. In `endow` it is a way around `platformBuiltins`, to be used knowingly.
- **Where the host provides none, it is `undefined`.**

Modules loaded this way run outside every Compartment and outside policy. They are as trusted as the Capability File which loads them.

### Capability Files Should Be Inert When Evaluated

Evaluating a Capability File should do nothing but call `repair` and `defineCapability`. Claims have to be known before Policy is merged, which may be at build time, so a Capability File may be evaluated more than once and in a process which never runs its callbacks.

Attempting to call `require()` or use the `import` keyword within the top level of a Capability File will result in a thrown exception.

### Types

In `@lavamoat/types/capability`:

```ts
/**
 * Loads a module, resolving from the Capability File.
 *
 * Since an `endow()` or `repair()` must be synchronous, this too must be
 * synchronous.
 *
 * **This function has no restrictions on what it may resolve and load.**
 */
export type CapabilityRequireFn = (specifier: string) => unknown

/** Parameters passed to an {@link EndowCallback}. */
export interface EndowParams {
  // ...existing fields unchanged...

  /**
   * The Platform Builtin for each name the capability claims, keyed by name: a
   * copy of the real builtin, or the result of an ambient capability.
   */
  platformBuiltins: Readonly<Record<string, object>>
  /**
   * The builtins this Compartment will receive, keyed by name. Starts empty.
   * Every claimed name must be assigned, and no other.
   */
  builtins: Record<string, object>
  /** Absent where the host provides none. */
  require?: CapabilityRequire
}

export interface CapabilityDefinition {
  ambient: boolean
  /**
   * Exact specifiers of the builtins this capability claims. Listing the
   * capability in Policy grants them, as replaced by `endow`. An ambient
   * capability replaces them everywhere and grants nothing.
   */
  builtins?: string[]
  endow: EndowCallback
}

/** Second argument to a `repair` callback. */
export interface RepairParams {
  /** Absent where the host provides none. */
  require?: CapabilityRequireFn
}

export type Repair = (
  callback: (realGlobalThis: object, params: RepairParams) => void
) => void
```

`CapabilityDefinition`, `EndowCallback` and `EndowParams` keep their names; there is still one kind of capability and one callback. `CapabilityIndex` and `DefineCapability` are unchanged, as is `CapabilitiesPolicy` in the Policy schema.

## Conflicts

The rule that a builtin claimed by a listed capability must not also appear under `builtin` cannot be expressed in the `LavaMoatPolicy` type defining the Policy. It is enforced in two places.

### Merging Removes Generated Entries

Policy generation never emits capabilities, so capabilities enter through overrides. A generated Policy will often already hold `builtin` entries for the builtin an override capability claims. The merge resolves this in favor of the capability.

When merging an override into a base Policy, for each resource and each capability the _override_ lists for it (with a value other than `false`): every key of the _base_ resource's `builtin` policy whose module is claimed by that capability is removed. A key's module is the text before its first `.`, matched exactly. With a claim on `fs`, the keys `fs` and `fs.promises.readFile` are removed, whatever their values. `node:fs` is not, unless that name is claimed too.

Only base entries are removed. `builtin` entries written in the override itself are kept, and so are entries in a base policy which itself lists the capability. Both are contradictions the author wrote by hand, and both are left for validation to reject.

To do this, `mergePolicy` needs the claims. It accepts them as an optional argument, and without them it merges as it does today.

### Validation Rejects What Remains

Before any application code runs, the host validates the final Policy against the claims.

> Policy generation should _never_ result in a merged Policy containing these errors, insofar as it has control over the output Policy.

Each of these is a fatal error, thrown as an exception which ends the process:

| Condition                                                                         | Example                                                                        | Notes                                                                |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| A resource lists a capability claiming builtin X and has a `builtin` key for X.   | `capabilities: { "fs-allowlist": [] }` with `builtin: { "fs.readFile": true }` | The capability overrides `BuiltinPolicy`.                            |
| The same, where the `builtin` value is `false`. A denial contradicts a grant too. | `capabilities: { "fs-allowlist": [] }` with `builtin: { "fs": false }`         | The capability overrides `BuiltinPolicy`.                            |
| A resource lists two capabilities which both claim builtin X.                     | `"fs-allowlist"` and `"graceful-fs"` on one resource                           | There is no concept of an "order" in which capabilities are applied. |
| Two ambient capabilities both claim builtin X.                                    | Ambient `graceful-fs` and ambient `traced-fs`                                  | There is no concept of an "order" in which capabilities are applied. |
| A resource lists a capability which was never defined.                            | Already an error today; unchanged                                              |                                                                      |

> [!NOTE]
>
> - Two listed capabilities sharing one builtin is _deliberately_ an error rather than a pipeline.
> - A future DX pass may want to provide a way for the user to control in which order capabilities are applied.
> - Likewise, we could consider applying `BuiltinPolicy` _after_ any capabilities are implied.

## Resolution

**When a Compartment is set up**, ambient capabilities run first, in the order they were registered. Then come the capabilities its resource lists, in the order listed. For each one which claims builtins:

1. The host finds the Platform Builtin for each claimed name: what an earlier capability stored for this Compartment under that name, or else a fresh copy of the real builtin.
2. `endow` runs with `platformBuiltins` filled and `builtins` empty.
3. The host checks `builtins` against the claims, and stores each value for this Compartment under its name, recording whether a listed capability stored it.

**When a Compartment imports specifier _S_:**

1. If a listed capability stored a builtin for this Compartment under _S_, the Compartment receives it.
2. Otherwise the `builtin` policy decides, exactly as today, with one difference: if an ambient capability stored a builtin under _S_, policy applies to that in place of the real one.

**The second half must hold on every path by which a module can be loaded**: static `import`, static `require`, dynamic `import()`, and dynamic `require`. A path which skips the lookup hands out the real builtin.

## Where the Logic Lives

[`custom-capabilities.md`][custom-capabilities] sets an encapsulation principle: [`endowmentsToolkit.js`](../packages/core/src/endowments-toolkit.js) is the only module which understands the definition passed to `defineCapability`, and the only caller of `endow`. Everything below lives in `lavamoat-core` and is shared by both hosts; the names are proposals.

- **Reading claims** — a function taking the registered capabilities and returning each capability's claims. It sits beside `evaluateCapabilities`, outside the toolkit factory, because claims are needed before a toolkit exists. The registration errors above belong here.
- **Loading real builtins** — the toolkit cannot load modules itself. The host passes a synchronous loader to the toolkit factory.
- **Copying** — the toolkit makes Platform Builtins. It already owns the function wrapper which function-valued builtins need.
- **Calling `endow`** — `getEndowmentsForConfig` and `copyWrappedGlobals` already call `endow`. They now also fill `platformBuiltins`, check `builtins` afterwards, and store the results keyed by the Compartment's `globalThis`, which both already receive. They also gain the ambient capabilities, which the toolkit separates out today but never applies.
- **Looking up** — a new toolkit function takes a Compartment's `globalThis` and a specifier, and returns the stored builtin if there is one, with whether it was a grant.
- **Passing `require`** — `evaluateCapabilities` accepts a `require` for each source, hands it to that source's `repair` callbacks, and keeps it with each capability the source registers.
- **Merging** — `mergePolicy` accepts claims and prunes as described.
- **Validating** — a function taking the final Policy and the claims, which throws on any conflict.

## Host Notes

### `@lavamoat/node`

Findings from `@endo/Compartment-mapper` 2.4.0 and `ses`, which the implementation must respect. The lookup mechanism has been read, not prototyped.

- **The lookup belongs in the exit hooks' module records.** `importHook` and `importNowHook` in [`packages/node/src/Compartment/import-hook.js`](../packages/node/src/Compartment/import-hook.js) each return a record whose `execute` method `ses` calls with the importing Compartment (`ses/src/module-instance.js`). `execute` can ask the toolkit for a builtin stored under `Compartment.globalThis` and the specifier, and export that in place of the real one. This covers static and dynamic loads alike, and the trusted root.
- **The hooks themselves cannot do it.** The async `importHook` does not learn which Compartment is importing: `@endo/compartment-mapper` wraps it (`exitModuleImportHookMaker` in `src/import-hook.js`) and passes the _entry_ Compartment's location for every call. Only `execute` knows.
- **The hooks are module-level constants today.** To reach the toolkit they must be made per run.
- **Endo must still permit the import.** Endo checks its own `builtins` (sic) policy before it executes an exit module. For each name claimed by a listed capability, the Policy converter must emit `true`. With `true`, Endo does not call the module attenuator, so nothing is applied twice.
- **Ambient replacements pass through the attenuator untouched by this design.** For a name an ambient capability claims, the converter emits what `builtin` policy says, as today. `execute` substitutes the replacement, and for property-level entries Endo's attenuator then picks from it.
- **`endow` runs early enough.** Endo finishes attenuating globals, and so calling `endow`, before the entry module executes.
- **Export names are fixed before the Compartment is known.** A record's list of export names comes from the real builtin. A replacement which adds a name exposes it through `require` and the default export, but not as a named ES import. A replacement which drops a name leaves that named import `undefined`.
- **Claims are needed earlier than they are available.** [`run()`](../packages/node/src/exec/run.js) currently loads and merges Policy, converts it, and only then evaluates Capability Files inside [`harden()`](../packages/node/src/preamble.js). Merging and converting now both depend on claims.
- **`require` needs a location.** [`evaluateCapabilities`](../packages/core/src/endowmentsToolkit.js) receives source text only. Each source needs a `require` made from its Capability File's location. Source passed directly through `run()`'s `capabilitySources` option has no location, and so no `require`.
- **Capabilities listed on the root are not applied today.** The trusted root's Endo policy is a constant which carries no capabilities, so a capability listed under `$root$` silently does nothing, for globals as well. Rule 5 assumes this is fixed.

#### Known Gap: Dynamic Requires Are Not Attenuated

This is an existing bug, independent of this design. It needs a fix whether or not builtin capabilities are implemented.

A builtin loaded through a dynamic `require` reaches the package unattenuated. Endo's synchronous path (`importExitModuleOrFail` in `src/import-hook.js`) checks that Policy permits the builtin and returns the module without calling the attenuator. A package whose policy grants `fs.existsSync` receives all of `fs` when it loads it through a computed specifier.

To reproduce, give a dependency this Policy and this code:

```json
{ "resources": { "dep": { "builtin": { "fs.existsSync": true } } } }
```

```js
// node_modules/dep/index.js
module.exports = () => {
  const fs = require(['f', 's'].join(''))
  return typeof fs.writeFileSync // 'function'; should be 'undefined'
}
```

The same package using a literal `require('fs')` gets an object with the single key `existsSync`.

The fix can live in Endo (attenuate on the synchronous path) or in LavaMoat's `importNowHook` (which is told the importing package).

Listed capabilities do not pass through the attenuator, so they do not wait on the fix. An ambient capability does, where a resource has property-level `builtin` entries: on the unfixed path that resource would receive the whole replacement.

#### Known Hazard: A Whole-Builtin Grant Shares the Real Module

This too exists today, independent of this design.

A resource whose `BuiltinPolicy` grants a whole builtin, such as `"path": true`, receives the real module object. So does the trusted root. Nothing is copied or frozen, so one package can change the builtin for every other package, for the root, and for LavaMoat and Endo themselves. Only property-level grants (`"path.join": true`) receive a fresh object.

To reproduce, grant two dependencies `"path": true`:

```js
// node_modules/dep-a/index.js
const path = require('path')
module.exports = () => {
  path.join = () => 'tampered-by-dep-a'
}
```

After `dep-a` runs, `path.join('a', 'b')` returns `'tampered-by-dep-a'` in the root, in the other dependency, and from `process.getBuiltinModule('path')` outside any Compartment.

This design neither causes nor cures it. It does mean the copies in `platformBuiltins` are a courtesy to capability authors, not a boundary: untrusted code already holds what `endow` is being kept away from.

**Possible future work:** a grant need not hand out the real object. Each Compartment could receive its own copy of a wholly granted builtin, made the way Platform Builtins are. That would carry the costs listed under [What a Platform Builtin is](#what-a-platform-builtin-is), applied to every package rather than to capability authors who opted in, and it would change behaviour for applications which patch a builtin on purpose to affect their dependencies.

### `@lavamoat/webpack`

- **One call site.** `enforcePolicy` in `src/runtime/runtime.js` holds the referrer's resource id when it decides what a builtin import returns, and `compartmentMap` maps that id to the Compartment. The lookup fits there.
- **The root short-circuits** before that point ("implicitly allow all for root"). For a capability to apply to the root, the lookup must come first.
- **Builtins are externals.** A claim is matched against the name by which policy knows the external.
- **A claimed name may resolve to a package.** Under webpack `fs` is often a dependency or a polyfill, governed by `packages` policy (`PackagePolicy`). This is why names are exact. Whether a claim on such a name should fail, as the general rule says, or apply to the package, is for the webpack implementation to settle.
- **Claims are needed at build time**, for merging and validation, while Capability Files are otherwise evaluated only at runtime. The inertness rule exists so that the build may evaluate them to read claims.
- **`require` is `undefined`.** Loading a module from a Capability File has no obvious meaning in a bundle, where the file is inlined as text. This design does not solve it.
- **Root capabilities already reach every package's globals.** `copyWrappedGlobals` applies the root's capabilities to the root Compartment's `globalThis`, from which every other package's globals are copied. Builtins do not work this way; see the open question below.

### `lavamoat-node` and Browserify

Not planned. For the record, `kernelCoreTemplate.js` has the same single call site as webpack and would be served by the same core changes.

## Security Considerations

- **Capability Files are trusted code**, and so is everything they `require`. They run unconfined. That was already true of `repair`.
- **Copies guard against mistakes, not malice.** `platformBuiltins` keeps a careless `endow` from altering what LavaMoat runs on. It cannot stop a capability which reaches for the real builtin through `require`, nor a module the capability loads: `graceful-fs`, for one, patches the real `fs.close` when it is first loaded, whatever it is later handed.
- **What `endow` assigns crosses a trust boundary.** Untrusted code receives it. Assigning a Platform Builtin whole gives the Compartment the entire builtin. A function which closes over the builtin is as safe as its argument checking.
- **An object assigned in several compartments is shared between them.** If it is not frozen, one package can change what another sees. Build each Compartment's module from its own Platform Builtin, as the examples do.
- **A capability is not a sandbox.** Restricting `fs` does little if the same resource may import `node:fs`, `fs/promises`, `child_process` or `module`, or holds a `process` with `binding`. The capability author chooses the claims; the Policy author must deny the other routes.
- **Policy alone no longer shows builtin access.** A reader of `policy.json` sees `"fs-allowlist": ["./data"]`, not the builtins it grants, and sees nothing at all of an ambient capability. Claims are static precisely so that tooling can print them next to the Policy.
- **Failure is closed.** An unassigned claim, a bad value, a conflict, an unknown capability and a duplicate claim all stop the process. None falls back to the real builtin.

## Deferred

- **Composition** of several listed capabilities claiming one builtin in one resource.
- **Generated Policy containing capabilities.** The pruning rule assumes capabilities come from overrides.
- Passing **the resource's Canonical Name or package name** as an `endow` parameter (`EndowParams`), which [`custom-capabilities.md`][custom-capabilities] also leaves unimplemented.
- Passing **the name of the requested builtin specifier** as an `endow` parameter (`EndowParams`).
- **Copies for ordinary grants**, described under the [known hazard section](#known-hazard-a-whole-builtin-grant-shares-the-real-module) above.
- **A "root" tier of builtins**, in which every Compartment's builtins derive from the root's (as globals do), was considered and dropped. Ambient capabilities serve the purpose without a shared object. This may be revisited.

## Open Questions

- **Root capabilities look global but are not.** In webpack, listing `reasonable-process` on the root trims the `process` global for every package, because globals derive from the root's. It would replace the `process` builtin for the root alone. The capability which means "everyone" is an ambient one. Should listing a claiming capability on the root _warn_ the user?
- **`require` under webpack.** The callbacks receive none there, and without it there is no good way to write `graceful-fs`-style capabilities for a bundle.

[custom-capabilities]: ./`custom-capabilities.md`
