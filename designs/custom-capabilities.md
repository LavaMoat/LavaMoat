# Custom capabilities

## design

Custom capability is conceptually similar to an attenuator mixed with a repair where instead of an item being endowed to a compartment for a package the functionality from Custom capability implementation is invoked and can modify the compartment global disk according to needs that it defaults to or parameters provided to it.

The design consists of two parts.

1. how custom capabilities are defined and used in policy files.
2. the structure of the custom capability.

### Using capabilities in policy

Capabilities are selected at the top level (precise selection is important for webpack bundle size but less important in node.js)
Every capability listed there will have its `repair` executed.

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

### Defining capabilities

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


defineCapability({
  ambient: false // if true, applies the capability to every compartment.
  endow: ({
      options, // aray of options from policy use
      endowments, //
      compartmentGlobalThis,
      rootCompartmentGlobalThis
    }) => {
      // detect you're handling root compartment: rootCompartmentGlobalThis === compartmentGlobalThis

    },


})



```

### Example usecases

reasonable-process - an attenuator for `process` returning a safe version of `process` for Node.js that has all the basic functionality but none of the really dangerous APIs. If a specific dangerous API is meant to be available, its name needs to be listed in the options. Can be applied globally on root or per resource. Could be implemented to endow more powerful process to individual resources while the root one is more limited.

define-to-set - Puts a new copy of Object and Reflect references in the compartment where it's used and inherit all the references except for the defineProperty method. The replaced implementations use the value or the return value of a getter and assign to globalThis with _set_ semantics. Works the same if first argument is not compartment globel.

endow-symbol-write - creates a writable (via getter and setter) symbol key(s)

endow-symbol-redefine - a mix of the above two.

brand-new-name-capability - any new global can be custom-made using existing globals and the per-resource options array. In node.js we could afford synchronously loading builtins for that.

### bikeshedding and open questions

naming things:

- capability vs power vs cap vs optinions/opinionateds
- all names in how the capability is defined

- is `ambient` too powerful?
- should capabilities cover builtins for node and if so, how?
  - the answer is probably yes, with a separate function like endow, but totally different parameters

- do they have to be called synchronously on module load or could `defineCapability` be called in the callback to `repair`?

## Implementation plan

Defined capabilities get passed to endowmentsToolkit as input and used in copyWrappedGlobals and getEndowmentsForConfig. After the proposed endowments object is ready, at the end of these functions, we iterate capabilities listed and apply them.
The input to endowmentsToolkit needs to be already arranged into a collection of all `endow` functions from capabilities, a separate collection of `endow` from ambient capabilities and an analogous set of local and ambient ones for builtins, if we decide to implement that too.

Both lavamoat/node and the Webpack plugin require these to be properly integrated. So on initial read of the policy overrides file, he detect the capabilities listed in the top level `use` field. They need to get imported. And the definitions of capabilities are read. And these pointer files.
These files need to be loaded in both lavamoat/node and in the webpack plugin accordingly.

In case of webpack, the way capabilities get inserted into the runtime would be very similar to the existing implementation of repairs. Main distinction being we need to inline all of the capabilities listed in the policy. Assuming they are only listed because they were being used without checking whether they're actually used. In the future, we could consider warning the user about unused capabilities in their policy.

For lavamoat/node, the files that need to be read as strings, and then passed around to a point where we're running lockdown. The call to lockdown needs to be split into repair and harden steps. and the following happens in between.

So now in both webpack and lava node, we are at a point where we need to execute the code from capabilities. What we do is create a new compartment, not associated with any of the load and import mechanisms. Now repair and define capability functions into that compartment and then proceed to evaluate every capabilities code in that compartment. The implementation of repair is simply a function that calls its callback with the current real top level global this. And defined capability is implemented as collecting the function defined under the name of the capability, which implies that defined capability needs to be different per evaluation, which implies potentially a new compartment for every custom capability.

The collection created by defined capabilities to then be passed around to reach the call to endowments toolkit and be passed in as part of its configuration.

### nice-to-haves

- an input to the defineCapability callback containing the canonical name of the compartment/resource - but that's not information that is now available to endowmentsTooklit at all and threading it consistently in both lavamoat/node and webpack plugin might not be worth the mess it'd create. the benefit on the other hand would be that a debugging tool could
