/// <reference types="ses" />

/**
 * Repair JS intrinsics
 *
 * The Hermes (or vanilla) SES shim is loaded as the first Metro polyfill, so
 * {@link repairIntrinsics} can be called.
 *
 * Called with lockdown options ideal for React Native apps.
 *
 * {@link lockdown} itself is not called to allow for vetted shims as Metro
 * polyfills before hardening (e.g. RN JS polyfills).
 *
 * Vanilla JS is used in this file (a Metro polyfill loaded after SES) or Babel
 * will transform it using require("@babel/runtime/helpers/slicedToArray"),
 * which breaks React Native runtime with `ReferenceError: Property 'require'
 * doesn't exist` when the bundle is executed.
 *
 * ES6 (arrow fn, destructured array params, etc) can be used, only if this file
 * ('repair.js') is also added to the user's Babel ignore and provided the
 * language features used here are supported by Hermes (@see
 * {@link https://github.com/facebook/hermes/blob/main/doc/Features.md} - sadly
 * this official list tends to be outdated, so it is safest to test in
 * node_modules/react-native/sdks/hermesc/osx-bin/hermes, or check source code
 * and previous issues).
 *
 * The Metro getPolyfills() function is primarily intended for low-level
 * polyfills that need to run before the React Native InitializeCore module and
 * app entry file module. These Metro polyfills run in separate execution
 * environments where Babel runtime and the `require` function are unavailable.
 * Yes, it's not very intuitive either, but it is what it is.
 *
 * @packageDocumentation
 */

const dumbPolyfillExposedInternals = Object.entries(Promise).filter(
  function (entry) {
    return !!entry[1] && entry[0].startsWith('_')
  }
)

 
repairIntrinsics({
  errorTaming: 'unsafe',
  consoleTaming: 'unsafe',
  errorTrapping: 'none',
  unhandledRejectionTrapping: 'none',
  overrideTaming: 'severe',
  stackFiltering: 'verbose',
  evalTaming: 'unsafe-eval',
})

// Hermes specific repairs or shims that need to exist before everything is frozen belong here:

// Hermes built-in implementation of Promise is using this global field internally to hold on to a noop function :|
Object.assign(Promise, Object.fromEntries(dumbPolyfillExposedInternals))
