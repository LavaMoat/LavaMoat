# LavaMoat - a Webpack Plugin for creating LavaMoat-protected builds

**NOTE: under rapid develop, not ready for production use, has not been audited, etc**

`lavamoat-webpack` is a [WebPack][Webpack] plugin for generating app bundles where modules are defined in [SES][SesGithub] containers. It aims to reduce the risk of "software supplychain attacks", malicious code in the app dependency graph.

It attempts to reduce this risk in three ways:
  1. Prevent modifying JavaScript's primordials (Object, String, Number, Array, ...)
  2. Limit access to the platform API (window, document, XHR, etc) per-package
  3. Prevent packages from corrupting other packages

1 and 2 are provided by the SES container. Platform access can be passed in via configuration.

3 is achieved by providing a unique mutable copy of the imported module's exports. Mutating the module's copy of the exports does not affect other modules.

[Webpack]: https://github.com/webpack/webpack
[SesGithub]: https://github.com/agoric/SES

### anatomy of a lavamoat bundle


##### generic bundle content

Like the result of other js bundlers, there are a few parts in the final bundle:

1. kernel / loader / runtime / trusted computing base
This is the code that initializes and runs the bundle. For example, the implementation of the `require` method.

2. manifest + module sources
This includes the js content of the module sources, as well as some config information like module name alaises.

##### lavamoat bundle content

The `lavamoat-webpack` plugin replaces the "main template" of the normal build system. This template takes all the modules and their metadata and outputs the final bundle content, including the kernel and lavamoat config.

LavaMoat builds differ from standard builds in that they:

1. include the app-specified lavamoat configuration

This tells the kernel what execution environment each module should be instantiated with, and what other modules may be brought in as dependencies

2. use a custom lavamoat kernel

This kernel enforces the lavamoat config. When requested, a module is initialized, usually by evaluation inside a SES container. The kernel also protects the module's exports from modification via a strategy provided in the config such as SES hardening, deep copies, or copy-on-write views.

3. bundle the module sources as strings

Modules are SES eval'd with access only to the platform APIs specificied in the config.

The result is a bundle that should work just as before, but provides some protection against supplychain attacks.
