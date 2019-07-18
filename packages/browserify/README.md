# Sesify - Browserify Plugin for Secure EcmaScript

**NOTE: under rapid develop, not ready for production use, has not been audited, etc**

Sesify is a [browserify][BrowserifyGithub] plugin for generating app bundles where modules are defined in [SES][SesGithub] containers. It aims to reduce the risk of "supplychain attacks", malicious code in the app dependency graph.

It attempts to reduce this risk in three ways:
  1. Prevent modifying JavaScript's primitives (Object, String, Number, Array, ...)
  2. Limit access to the platform API (window, document, XHR, etc)
  3. Prevent overwriting a module's exports

1 and 2 are provided by the SES container. Platform access can be passed in via configuration.

3 is achieved by providing a mutable copy of the `require`'d module's exports. Mutating the module's copy of the exports does not affect other modules.


[BrowserifyGithub]: https://github.com/browserify/browserify
[SesGithub]: https://github.com/agoric/SES

### videos demonstration (8 mins)

early demo (8 mins)
[![early demo (8 mins)](https://img.youtube.com/vi/S2_rjQ-_Nnw/0.jpg)](https://www.youtube.com/watch?v=S2_rjQ-_Nnw)

progress update with data viz on Agoric call Jul 13, 2019 (~1 hr)
[![progress update with data viz on Agoric call](https://img.youtube.com/vi/jMWXA4JqFqI/0.jpg)](https://www.youtube.com/watch?v=jMWXA4JqFqI)
