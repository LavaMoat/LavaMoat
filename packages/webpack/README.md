# LavaMoat Webpack Plugin

> Putting lava in your pack. For security. We need to work on our metaphors.

LavaMoat Webpack Plugin wraps each module in the bundle in a [Compartment](https://github.com/endojs/endo/tree/master/packages/ses#compartment) and enforces LavaMoat Policies independently per package.

## Usage

> Policy generation is now built into the plugin. While it might get confused about aliases and custom resolvers, it should generally work even when they're in use.

1. Create a webpack bundle with the LavaMoat plugin enabled and the `generatePolicy` flag set to true
2. Make sure you add a `<script src="./lockdown"></script>` before all other scripts or enable the `HtmlWebpackPluginInterop` option if you're using `html-webpack-plugin`. (Note there's no `.js` there because it's the only way to prevent webpack from minifying the file thus undermining its security guarantees)
3. Tweak the policy if needed with policy-override.json

> The plugin is emitting lockdown without the `.js` extension because that's the only way to prevent it from getting minified, which is likely to break it.

The LavaMoat plugin takes an options object with the following properties (all optional):

| Property                   | Description                                                                                                                                                                                                                                                                                                           | Default                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `policyLocation`           | Directory to store policy files in.                                                                                                                                                                                                                                                                                   | `./lavamoat/webpack`     |
| `generatePolicy`           | Whether to generate the `policy.json` file. Generated policy is used in the build immediately. `policy-override.json` is applied before bundling, if present.                                                                                                                                                         | `false`                  |
| `emitPolicySnapshot`       | If enabled, emits the result of merging policy with overrides into the output directory of Webpack build for inspection. The file is not used by the bundle.                                                                                                                                                          | `false`                  |
| `readableResourceIds`      | Boolean to decide whether to keep resource IDs human readable (possibly regardless of production/development mode). If `false`, they are replaced with a sequence of numbers. Keeping them readable may be useful for debugging when a policy violation error is thrown. By default, follows the Webpack config mode. | `(mode==='development')` |
| `lockdown`                 | Configuration for [SES lockdown][]. Setting the option replaces defaults from LavaMoat.                                                                                                                                                                                                                               | reasonable defaults      |
| `HtmlWebpackPluginInterop` | Boolean to add a script tag to the HTML output for `./lockdown` file if `HtmlWebpackPlugin` is in use.                                                                                                                                                                                                                | `false`                  |
| `inlineLockdown`           | A RegExp for matching files to be prepended with lockdown (instead of adding it as a file to the output directory).                                                                                                                                                                                                   |
| `runChecks`                | Boolean property to indicate whether to check resulting code with wrapping for correctness.                                                                                                                                                                                                                           | `false`                  |
| `diagnosticsVerbosity`     | Number property to represent diagnostics output verbosity. A larger number means more overwhelming diagnostics output. Setting a positive verbosity will enable `runChecks`.                                                                                                                                          | `0`                      |
| `debugRuntime`             | Only for local debugging use - Enables debugging tools that help detect gaps in generated policy and add missing entries to overrides                                                                                                                                                                                 | `false`                  |
| `policy`                   | The LavaMoat policy object (if not loading from file; see `policyLocation`)                                                                                                                                                                                                                                           | `undefined`              |

```js
const LavaMoatPlugin = require('@lavamoat/webpack')

module.exports = {
  // ... other webpack configuration properties
  plugins: [
    new LavaMoatPlugin({
      generatePolicy: true,
      // ... settings from above, optionally
    }),
  ],
  // ... other webpack configuration properties
}
```

One important thing to note when using the LavaMoat plugin is that it disables the `concatenateModules` optimization in webpack. This is because concatenation won't work with wrapped modules.

### Excluding modules

> [!WARNING]
> This is an experimental feature and excluding may be configured differently in the future if this approach is proven insecure.

The default way to define specific behaviors for webpack is creating module rules. To ensure exclude rules are applied on the same exact files that match certain rules (the same RegExp may be matched against different things at different times) we're providing the exclude functionality as a loader you can add to the list of existing loaders or use individually.  
The loader is available as `LavaMoatPlugin.exclude` from the default export of the plugin. It doesn't do anything to the code, but its presence is detected and treated as a mark on the file. Any file that's been processed by `LavaMoatPlugin.exclude` will not be wrapped in a Compartment.

> [!NOTE]
> Exclude loader will only work when used in webpack config. Specifying it inline `require('path/to/excludeLoader.js!./module.js')` will not result in module.js being excluded. (This is a security feature to prevent your dependencies from declaring they want to be excluded.)

Example: avoid wrapping CSS modules:

```js
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          LavaMoatPlugin.exclude,
        ],
        // ...
      },
    ],
  },
```

See: `examples/webpack.config.js` for a complete example.

### Gotchas

#### Implicit modules

- Webpack may include dependencies polyfilling Node.js built-ins, such as the `events` or `buffer` packages. In other cases, it will ignore the built-ins and provide empty modules in their place (see below).

When a dependency (eg. `buffer`) is provided by Webpack, and you need to add it explicitly to your dependencies, you'll receive the following error:

```
Error: LavaMoat - Encountered unknown package directory for file "/home/(...)/node_modules/buffer/index.js"
```

#### Webpack-ignored modules

When a built-in Node.js module is ignored, Webpack generates something like this:

```js
const nodeCrypto = __webpack_require__(/*! crypto */ '?0b7d')
```

A carveout is necessary in policy enforcement for these modules.
Sadly, even treeshaking doesn't eliminate that module. It's left there and failing to work when reached by runtime control flow.

This plugin will skip policy enforcement for such ignored modules.

#### HMR

LavaMoat is not compatible with Hot Module Replacement (HMR). Disable LavaMoat for development builds where HMR is required while keeping it enabled for production builds.

# Security

**This is an experimental software. Use at your own risk!**

- [SES lockdown][] must be added to the page without any bundling or transforming for any security guarantees to be sustained.
  - The plugin is attempting to add it as an asset to the compilation for the sake of Developer Experience. `.js` extension is omitted to prevent minification.
  - Optionally lockdown can be inlined into the bundle files. You need to declare which of the output files to inline lockdown runtime code to. These need to be the first file of the bundle that get loaded on the page.  
    When you have a single bundle, you just configure a regex with one unique file name or a `.*`. It gets more complex with builds for multiple pages. The plugin doesn't attempt to guess where to inline lockdown.  
    e.g. If you have 2 entries `user.js` and `admin.js` and a set up to suffix resulting bundles with commit id, you can use `/user\.[a-f0-9]+\.js|admin\.[a-f0-9]+\.js/` to match the files.
- Each javascript module resulting from the webpack build is scoped to its package's policy

## Threat Model

- Webpack itself is considered trusted.
- All plugins can bypass LavaMoat protections intentionally.
- It's unlikely _but possible_ that a plugin can bypass LavaMoat protections _unintentionally_.
- It should not be possible for loaders to bypass LavaMoat protections.
- Some plugins (eg. MiniCssExtractPlugin) execute code from the bundle at build time. To make the plugin work you need to trust it and the modules it runs and add the LavaMoat.exclude loader for them.
- This Webpack plugin _does not_ protect against malicious execution by other third-party plugins at runtime (use [LavaMoat](https://npm.im/lavamoat) for that).

## Webpack runtime

Elements of the Webpack runtime (e.g., `__webpack_require__.*`) are currently mostly left intact. To avoid opening up potential bypasses, some functionality of the Webpack runtime is not available.

# Testing

Run `npm test` to start the automated tests.

## Manual testing

- Navigate to `example/`
- Run `npm ci` and `npm test`
- Open `dist/index.html` in your browser and inspect the console

[SES lockdown]: https://github.com/endojs/endo/tree/master/packages/ses#lockdown
