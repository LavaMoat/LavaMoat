# lavamoat-node express example

this currently doesn't work for two reasons:
1. LavaMoat's version of SES doesn't support the package `depd`'s use of `Error.prepareStackTrace`. This can be monkey-patched by setting that package's `package.json` "main" field to the value of its "browser" field, which does not use this API.
2. LavaMoat's "module exports defense" strategy is based on the `cytoplasm` Membrane implementation. It currently does not correctly unwrap values before passing them to platform APIs.