# Sesify - Browserify Plugin for Secure EcmaScript

**NOTE: under rapid develop, not ready for production use, has not been audited, etc**

Sesify is a [browserify][BrowserifyGithub] plugin for generating app bundles where modules are defined in [SES][SesGithub] containers. It aims to reduce the risk of "supplychain attacks", malicious code in the app dependency graph.

It attempts to reduce this risk in three ways:
  1. Prevent modifying JavaScript's primordials (Object, String, Number, Array, ...)
  2. Limit access to the platform API (window, document, XHR, etc)
  3. Prevent overwriting a module's exports

1 and 2 are provided by the SES container. Platform access can be passed in via configuration.

3 is achieved by providing a mutable copy of the `require`'d module's exports. Mutating the module's copy of the exports does not affect other modules.


[BrowserifyGithub]: https://github.com/browserify/browserify
[SesGithub]: https://github.com/agoric/SES

### anatomy of a sesify bundle


##### generic bundle content

Like the result of other js bundlers, there are a few components in the final bundle:

1. kernel / loader / runtime / trusted computing base
This is the code that initializes and runs the bundle. For example, the implementation of the `require` method.

2. manifest + module sources
This includes the js content of the module sources, as well as some config information like module name alaises.

##### sesify bundle content 

The sesify plugin replaces the last internal build step of the normal build system. This step takes all the modules and their metadata and outputs the final bundle content, including the kernel and manifest.

Sesify builds differ from standard browserify builds in that they:

1. include the app-specified sesify configuration

This tells the kernel what execution environment each module should be instantiated with, and what other modules may be brought in as dependencies 

2. use a custom sesify kernel

This kernel enforces the sesify config. When requested, a module is initialized, usually by evaluation inside a SES container. The kernel also protects the module's exports from modification via a strategy provided in the config such as SES hardening, deep copies, or copy-on-write views.

3. bundle the module sources as strings

Since modules need to be SES eval'd, they are delivered as strings to reduce parsing overhead. 


The result is a bundle that should work just as before, but provides some protection against supplychain attacks. 


### videos demonstration (8 mins)

early demo (8 mins)
[![early demo (8 mins)](https://img.youtube.com/vi/S2_rjQ-_Nnw/0.jpg)](https://www.youtube.com/watch?v=S2_rjQ-_Nnw)

progress update with data viz on Agoric call Jul 13, 2019 (~1 hr)
[![progress update with data viz on Agoric call](https://img.youtube.com/vi/jMWXA4JqFqI/0.jpg)](https://www.youtube.com/watch?v=jMWXA4JqFqI)
