/** @typedef {import('webpack').NormalModule} NormalModule */
/** @typedef {import('./policyGenerator').InspectableWebpackModule} InspectableWebpackModule */

const path = require('node:path')
const EXCLUDE_LOADER = path.join(__dirname, '../excludeLoader.js')

module.exports = {
  /**
   * Safe version of exclude lookup - checks for the possibility of injecting a
   * loader chain. Can be used for building the bundle.
   *
   * @param {NormalModule} module
   * @returns {boolean}
   */
  isExcluded: (module) => {
    // Only accept exclude loader from config, not inline.
    // Inline loader definition uses a `!` character as a loader separator.
    // Defining what to exclude should only be possible in the config.
    return (
      module.loaders.some(({ loader }) => loader === EXCLUDE_LOADER) &&
      !module.rawRequest.includes('!')
    )
  },
  /**
   * Unsafe version of exclude lookup - does not check for the possibility of
   * injecting a loader chain. Intended use in policy generation.
   *
   * @param {InspectableWebpackModule} module
   * @returns {boolean}
   */
  isExcludedUnsafe: (module) => {
    return (
      'loaders' in module &&
      !!module.loaders?.some(({ loader }) => loader === EXCLUDE_LOADER)
    )
  },
}
