# ScorchWrap PoC

ScorchWrap is a webpack plugin that wraps each module in the bundle in a container and enforces LavaMoat Policies per package.

Implemented capabilities:

 - [x] wrapping built module sources 
 - [x] runtime to make wrapped modules work
 - [x] turn off concatenateModules and warn it's incompatible
 - [ ] inlining runtime into the bundle
 - [ ] using actual policies
 - [ ] researching and covering all `__webpack_require__.*` functions for security as needed 
 - [ ] paranoid mode checks
 - [ ] research potential concatenateModules support
 - [ ] ecosystem compatibility quirks we're yet to find


## Usage

The ScorchWrap plugin takes an optional options object with the following properties:

- runChecks: Optional boolean property to indicate whether to check resulting code with wrapping for correctness. Default is false.
- diagnosticsVerbosity: Optional number property to represent diagnostics output verbosity. A larger number means more overwhelming diagnostics output. Default is 0.  
  Setting positive verbosity will enable runChecks.

```js
const ScorchWrapPlugin = require('@lavamoat/scorchwrap');

module.exports = {
  // ... other webpack configuration properties
  plugins: [
    new ScorchWrapPlugin({
      policy: { ... LavaMoat policy structure ... }
      runChecks: true,
    //   diagnosticsVerbosity: 2,
    }),
  ],
  // ... other webpack configuration properties
};
```

One important thing to note when using the ScorchWrap plugin is that it disables the `concatenateModules` optimization in webpack. This is because concatenation won't work with wrapped modules.

# Security Claims

- SES must be added to the page without any bundling or transforming for any security guarantees to be sustained.
- Each javascript module resulting from the webpack build is scoped to its package's policy

Threat model

- webpack itself is considered trusted
- all plugins can bypass LavaMoat protections intentionally
- It's unlikely but possible that a plugin can bypass LavaMoat protections unintentionally
- It should not be possible for loaders to bypass LavaMoat protections
- Some plugins (eg. MiniCssExtractPlugin) execute code from the bundle at build time. To make the plugin work you need to trust it and the modules it runs and add the ScorchWrap.ignore loader for them.
# Development

## Manual testing

run `yarn` and `yarn lib:ses` in the packages/scorchwrap folder before you begin

`cd app`  
run `npm ci`  
run `npm test` to trigger the build  
open dist/index.html in the browser and look at the console

## Testing TODO

List of what to cover ordered by priority

- [ ] e2e test creating a bundle and run it in a headless browser to check for errors
- [ ] cover all module types
- [ ] configure bundle splitting
- [ ] cover all types of runtimeRequirements with examples (stuff passed to closures along with modue and exports and `__webpack_require__`, also all the methods on `__webpack_require__`)
- [ ] cover webpack magic comments

## Features

### policy

There's two ways we could handle policy
1. inline into each module at compilation time 
   We're working per-module, so this would produce a lot of duplication but eliminate the need to store entire policy with keys for each package.
2. add to runtime, keyed  
   For now holding on to the entire policy seems like a better idea, we could compress the keys at compile time easily.
   
Current implementation inlines the policy as-is into the bundle.

### package identification
If we run a'a' on the dependencies, we're going to need means to look them up by path. It'd be nice to collect the paths first and only create IDs based on the paths included in the bundle instead of going through entire node_modules. We could collect the IDs on an earlier phase, before generate, to create a mapping from paths to IDs only for the packages involved. 

After a mapping is built, the actual values of identifiers are no longer important, for bundling policy into the runtime and wrapping packages they just need to match, so it makes sense to replace them with random values before they're rendered into the bundle.




### modes

- default 
- paranoid - adds extra checks

Things it could check in paranoid mode
- use other hooks to check if the number of bundle entries equals the number of entries processed by the wrapper
- add a local reference before the with blocks and a function within to look it up and alert if it can be found - should trigger if a transform or plugin action breaks the withproxies. This would be best implemented by the plugin injecting a tiny module with the source to do this.
- allow optionally importing a canary package that tries to escape (kinda overlaps with above, but could use more methods)
- run an AST on the final bundle to identify the scopes without the `with` blocks (after all minitication etc.)
