/** @typedef {import('webpack').NormalModule} NormalModule */

const path = require('node:path')
const EXCLUDE_LOADER = path.join(__dirname, '../excludeLoader.js')

module.exports = {
  /**
   * Safe version of exclude lookup - checks for the possibility of injecting
   * a loader chain. Can be used for building the bundle.
   *
   * @param {NormalModule} module
   * @returns {boolean}
   */
  isExcluded: (module) => {
    return (
      module.loaders.some(({ loader }) => loader === EXCLUDE_LOADER) &&
      !module.rawRequest.includes('!')
    )
  },
  /**
   * Unsafe version of exclude lookup - does not check for the possibility of
   * injecting a loader chain. Intended use in policy generation.
   *
   * @param {NormalModule} module
   * @returns {boolean}
   */
  isExcludedUnsafe: (module) => {
    return module.loaders.some(({ loader }) => loader === EXCLUDE_LOADER)
  },
}
