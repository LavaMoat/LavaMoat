# LavaMoat - a Webpack Plugin for LavaMoat-protected builds

**NOTE: this is a proof of concept and does not work yet**

this webpack plugin is a proof of concept and does not work yet

---

[**Quick Start Example**](https://github.com/LavaMoat/lavamoat-webpack/blob/master/test/project1/README.md)

`lavamoat-webpack` is a [WebPack][Webpack] plugin for generating app bundles protected by [LavaMoat](https://github.com/LavaMoat/overview) where modules are defined in [SES][SesGithub] containers. It aims to reduce the risk of "software supplychain attacks", malicious code in the app dependency graph.

It attempts to reduce this risk in three ways:
  1. Prevent modifying JavaScript's primordials (Object, String, Number, Array, ...)
  2. Limit access to the platform API (window, document, XHR, etc) per-package
  3. Prevent packages from corrupting other packages

1 and 2 are provided by the SES container. Platform access can be passed in via configuration.

3 is achieved by providing a unique mutable copy of the imported module's exports. Mutating the module's copy of the exports does not affect other modules.

[Webpack]: https://github.com/webpack/webpack
[SesGithub]: https://github.com/agoric/SES

```
npm i lavamoat-webpack
```

## Anatomy of a LavaMoat bundle

The `lavamoat-webpack` plugin replaces Webpack's `mainTemplate` functionality. It uses the `render` hook, a phase where all modules are exposed within chunks. This step takes all the modules and their metadata, runs them through the Lavamoat kernel, applies configuration options and returns Lavamoat protected modules back to Webpack. The final bundle content includes the kernel and configuration file.

LavaMoat builds differ from standard webpack builds in that they:

1. Include the app-specified LavaMoat configuration

This tells the kernel what execution environment each module should be instantiated with, and what other modules may be brought in as dependencies.

2. Use a custom LavaMoat kernel

This kernel enforces the LavaMoat config. When requested, a module is initialized, usually by evaluation inside a SES container. The kernel also protects the module's exports from modification via a strategy provided in the config such as SES hardening, deep copies, or copy-on-write views.

3. Bundle the module sources as strings

Modules are SES eval'd with access only to the platform APIs specificied in the config.

The result is a bundle that should work just as before, but provides some protection against supplychain attacks.

## Usage 

Ensure you have webpack installed:

```
npm i -g webpack
```

### Automated Config Generation

Create a `webpack.config.js` with the following:

```javascript
const LavaMoatPlugin = require('...')

module.exports = {
  optimization: {
    concatenateModules: false,
  },
  plugins: [
    new LavaMoatPlugin({
      writeAutoConfig: true,
    })
  ]
}
```

Ensure an entry file exists, such as `entry.js`, then run Webpack:

```bash
webpack
```

First, we require `LavaMoatPlugin`. The plugin is initialized in Webpack's `plugins` option as a new instance with its own plugin options.

We pass in `writeAutoConfig` as the only plugin option. This tells Lavamoat to parse all the dependencies and generate a configuration file with default settings at the default path `./lavamoat/lavamoat-config.json`.

`writeAutoConfig` also generates a default override config file, `lavamoat-config-override.json`, in the same default directory, if it doesn't already exist. This file is useful for applying custom modifications to the config that won’t be over written. In most cases, it won't be necessary to make changes to this file, unless a more fine grain of control over module permissions is necessary. See the config override section below for more details.

`optimization.concatenateModules` tells Webpack to find segments of the module graph which can be safely concatenated into a single module. We want to ensure this is disabled, because Lavamoat's configuration is independently module-specific.

### Building

Once we have a config (generated from `writeAutoConfig` or otherwise), create the Webpack bundle with LavaMoat, pass in the config path and run Webpack as usual.

```javascript
  plugins: [
    new LavaMoatPlugin({
      config: './lavamoat/lavamoat-config.json',
    })
  ]
```

```bash
webpack
```

Here we pass in `config` with the path to our generated configuration file. `config` provides Lavamoat with the file's location, relative to the current working directory. If nothing is passed in, it defaults to `./lavamoat/lavamoat-config.json`.

Lavamoat will now use that config in the build pipeline.

`config` can also be applied as an object or a function that resolves to the file path string or object literal. See `README.md` in [lavamoat-browserify](https://github.com/LavaMoat/lavamoat-browserify/blob/master/README.md).

### Config Override

You may wish to modify the config for finer control over module permissions.

```javascript
  plugins: [
    new LavaMoatPlugin({
      configOverride: './lavamoat/lavamoat-config-override.json',
    })
  ]
```

```bash
webpack
```

`overrideConfig` specifies the path to the override config file. If nothing is passed in, it defaults to `lavamoat/lavamoat-config-override.json`. 

Lavamoat will now apply the changes made in the override config to the generated config upon next build.

`configOverride` can also be applied as an object or a function that resolves to the file path string or object literal, just like `config`.

WARNING: Do not edit the autogenerated config `lavamoat-config.json` directly. It will be overwritten if a new bundle is created using LavaMoat. Instead, edit the `lavamoat-config-overwrite.json` file generated upon running LavaMoat with `writeAutoConfig`. It merges with the original config, always taking overwrite precedence. 

## Next Steps

Include the generated bundle in some HTML and serve.

See [lavamoat-browserify](https://github.com/LavaMoat/lavamoat-browserify/blob/master/README.md) for more detailed documentation about the config.



