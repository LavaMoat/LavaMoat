# LavaMoat - a Browserify Plugin for creating LavaMoat-protected builds

**NOTE: under rapid develop, not ready for production use, has not been audited, etc**

`lavamoat-browserify` is a [browserify][BrowserifyGithub] plugin for generating app bundles protected by [LavaMoat](https://github.com/LavaMoat/overview), where modules are defined in [SES][SesGithub] containers. It aims to reduce the risk of "software supplychain attacks", malicious code in the app dependency graph.

[BrowserifyGithub]: https://github.com/browserify/browserify
[SesGithub]: https://github.com/agoric/SES

### anatomy of a LavaMoat bundle

The `lavamoat-browserify` plugin replaces the last internal build step of the [compiler pipeline](https://github.com/browserify/browserify-handbook#compiler-pipeline). This step takes all the modules and their metadata and outputs the final bundle content, including the kernel and LavaMoat config.

LavaMoat builds differ from standard browserify builds in that they:

1. include the app-specified LavaMoat configuration

This tells the kernel what execution environment each module should be instantiated with, and what other modules may be brought in as dependencies

2. use a custom LavaMoat kernel

This kernel enforces the LavaMoat config. When requested, a module is initialized, usually by evaluation inside a SES container. The kernel also protects the module's exports from modification via a strategy provided in the config such as SES hardening, deep copies, or copy-on-write views.

3. bundle the module sources as strings

Modules are SES eval'd with access only to the platform APIs specificied in the config.

The result is a bundle that should work just as before, but provides some protection against supplychain attacks.

### usage

see [lavamoat-browserify-examples](https://github.com/LavaMoat/lavamoat-browserify-examples/) for usage examples

There are two phases for using the `browserify-lavamoat` plugin.

#### automated config generation

LavaMoat can auto generate a working config for you by parsing your dependencies. You should be sure to use the same browserify configuration (eg. plugins and transforms like `babelify`) that you normally use, so that it can parse the code as it will appear in your final bundle. Ignore the output of this command.

#### bundle

build with lavamoat-browserify, including a reference to the generated config file

### videos

Introduction to LavaMoat

[![introduction to LavaMoat](https://img.youtube.com/vi/pOTEJy_FqIA/0.jpg)](https://www.youtube.com/watch?v=pOTEJy_FqIA)
