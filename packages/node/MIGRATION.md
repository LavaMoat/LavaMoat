# `@lavamoat/node` Migration Guide

## `@lavamoat/node`: v1.x.x → v2.0.0

v2.0.0 removes the polymorphic / XOR-shaped policy loading APIs in favour of a typed `PolicyInput` model and a `Merged<T>` wrapper.

### Replacements

| v1.x (removed)                                                               | v2.0.0                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `loadPolicies(pathOrPolicy, opts)`                                           | `loadPolicy(policyInput(...))`                                               |
| `toEndoPolicy(pathOrPolicy, opts)`                                           | `loadPolicy(input)` then `toEndoPolicy(merged)`                              |
| `toEndoPolicy(merged, opts)`                                                 | `toEndoPolicy(merged)` (no `opts`)                                           |
| `RunOptions.{policy,policyPath,policyOverride,policyOverridePath}`           | `RunOptions.policyInput: PolicyInput`                                        |
| `GeneratePolicyOptions.{policyPath,policyOverride,policyOverridePath}`       | `GeneratePolicyOptions.policyInput: PolicyInput`                             |
| `GeneratePolicyResult.policy: MergedLavaMoatPolicy`                          | `GeneratePolicyResult.policy: Merged<LavaMoatPolicy>` (use `unwrapMerged()`) |
| `MergedLavaMoatPolicy` (symbol brand)                                        | `Merged<T>` wrapper                                                          |
| `UnmergedLavaMoatPolicy`                                                     | `PolicySource` factories                                                     |
| `WithPolicyOverride` / `WithPolicyOverridePath` / `WithPolicyOverrideOrPath` | `PolicyOverrideSource` factories                                             |
| `LoadPoliciesOptions`                                                        | `PolicyInput`                                                                |
| `isMergedPolicy(value)`                                                      | `isMergedWrapper(value)`                                                     |
| `constants.MERGED_POLICY_FIELD`                                              | (removed; no replacement)                                                    |

### Before / After

#### Loading and running a policy

**Before (v1.x):**

```js
import { run } from '@lavamoat/node'

await run('./app.js', {
  policyPath: '/app/lavamoat/node/policy.json',
  policyOverridePath: '/app/lavamoat/node/policy-override.json',
})
```

**After (v2.0.0):**

```js
import {
  run,
  policyInput,
  policySourceFromFile,
  policyOverrideSourceFromFile,
} from '@lavamoat/node'

await run('./app.js', {
  policyInput: policyInput({
    policy: policySourceFromFile('/app/lavamoat/node/policy.json'),
    override: policyOverrideSourceFromFile(
      '/app/lavamoat/node/policy-override.json'
    ),
  }),
})
```

#### Converting a policy to Endo format

**Before (v1.x):**

```js
import { toEndoPolicy } from '@lavamoat/node'

const endoPolicy = await toEndoPolicy('/app/lavamoat/node/policy.json', {
  policyOverridePath: '/app/lavamoat/node/policy-override.json',
})
```

**After (v2.0.0):**

```js
import {
  loadPolicy,
  toEndoPolicy,
  policyInput,
  policySourceFromFile,
  policyOverrideSourceFromFile,
} from '@lavamoat/node'

const merged = await loadPolicy(
  policyInput({
    policy: policySourceFromFile('/app/lavamoat/node/policy.json'),
    override: policyOverrideSourceFromFile(
      '/app/lavamoat/node/policy-override.json'
    ),
  })
)
const endoPolicy = await toEndoPolicy(merged)
```

#### Accessing the merged policy object

The result of `generatePolicy()` now returns `policy: Merged<LavaMoatPolicy>` instead of `MergedLavaMoatPolicy`. Use `unwrapMerged()` to access the underlying `LavaMoatPolicy`.

```js
import { generatePolicy, unwrapMerged } from '@lavamoat/node'

const { policy } = await generatePolicy('./app.js')
const rawPolicy = unwrapMerged(policy) // LavaMoatPolicy
```
