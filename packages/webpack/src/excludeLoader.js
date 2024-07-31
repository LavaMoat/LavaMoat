/**
 * A loader that does nothing, but when used in the loader chain, marks the
 * module as excluded from wrapping by LavaMoat.
 *
 * @module excludeLoader
 */
module.exports = (/** @type {any} */ source) => source
