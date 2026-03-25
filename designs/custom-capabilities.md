# Custom capabilities

> This is speculative. Much of it is still impossible to do for webpack and I don't want to have two separate systems

Custom capability is conceptually similar to an attenuator mixed with a repair where instead of an item being endowed to a compartment for a package the functionality from Custom capability implementation is invoked and can modify the compartment global disk according to needs that it defaults to or parameters provided to it.

The design consists of two parts.

1. how custom capabilities are defined and used in policy files.
2. the structure of the custom capability.

## Using capabilities in policy

Capabilities are selected at the top level (precise selection is important for webpack bundle size but less important in node.js)
Every capability listed there will have its `repair` executed.

```js
{
  "capabilities": [
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
        "define-to-set": []
        "endow-symbol-write": ['nameofthesymbol', 'nameoftAnotherSymbol']
      },
      "globals": {  }
    },
    "other>package": {
      "globals": {
        "process": true // still protected by the root thing
      }
    }
  }
}
```

The difference between using it for a package versus defining globally is that the global definitions can provide repairs while for an individual package repairs are going to be ignored because there is no way to run them anymore within the lockdown process.
Using a capability that provides repairs inside of a resource should throw an error.

the strings in the `capabilities` array are valid selectors that can be resolved from the location of the policy-override.js The design assumes listing them covers simple cases and, if needed they can be composed in a single local file by the end user.

## Defining capabilities

Capablity Module is a module with a default export containing available capability names as keys and file locations where the capabilities are implemented as values, like so:

```js
{
    "capability-name": require.resolve('./src/capabilityname.js')
}
```

Capability names must be unique for a policy. A local CapabilityModule can be used to compose a selection of unique capabilities from multiple dependencies

The capability file is taken in as text (minified in case of webpack) and evaluated in a compartment endowed with `repair` and `defineCapability`

`repair` registers the function from argument to run in lockdown and passes real `globalThis` to it for repairs.

`defineCapability` puts functions in a collection to pass them into endowmentsToolkit to be used

```
repair((realGlobalThis) => {
    // make repairs here
    // it's ok to preserve globalThis in higher scope.
})


defineCapability((preparedEndowments, compartmentGlobalThis, options) => {

})

```

To Be Decided: do the have to be called synchronously on module load or could `defineCapability` be called in the callback to `repair`?

## Example usecases

reasonable-process - an attenuator for `process` returning a safe version of `process` for Node.js that has all the basic functionality but none of the really dangerous APIs. If a specific dangerous API is meant to be available, its name needs to be listed in the options. Can be applied globally on root or per resource. Could be implemented to endow more powerful process to individual resources while the root one is more limited.

define-to-set - Puts a new copy of Object and Reflect references in the compartment where it's used and inherit all the references except for the defineProperty method. The replaced implementations use the value or the return value of a getter and assign to globalThis with _set_ semantics. Works the same if first argument is not compartment globel.

endow-symbol-write - creates a writable (via getter and setter) symbol key(s)

endow-symbol-redefine - a mix of the above two.

brand-new-name-capability - any new global can be custom-made using existing globals and the per-resource options array. In node.js we could afford synchronously loading builtins for that.
