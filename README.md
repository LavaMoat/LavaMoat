# Sesify - Browserify Plugin for Secure EcmaScript

**NOTE: under rapid develop, do not use, etc**

Sesify is a [browserify][BrowserifyGithub] plugin for generating app bundles where modules are defined in [SES][SesGithub] containers. It aims to reduce the risk of "supplychain attacks", malicious code in the app dependency graph.

It attempts to reduce this risk in three ways:
  1. Prevent modifying JavaScript's primitives (Object, String, Number, Array, ...)
  2. Limit access to the platform API (window, document, XHR, etc)
  3. Prevent overwriting a module's exports

1 and 2 are provided by the SES container. Platform access can be passed in via configuration.

3 is achieved by providing a fresh instantiation of each `require`'d module each time its requested.


[BrowserifyGithub]: https://github.com/browserify/browserify
[SesGithub]: https://github.com/agoric/SES
