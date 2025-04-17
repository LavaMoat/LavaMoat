/**
 * Harden JS intrinsics
 *
 * The Hermes (or vanilla) SES shim is loaded as the first Metro polyfill, so
 * {@link hardenIntrinsics} can be called.
 *
 * Called after Metro includes polyfills in the bundle.
 */

// eslint-disable-next-line no-undef
hardenIntrinsics()
