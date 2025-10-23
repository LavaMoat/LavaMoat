/** @import {LavaMoatScuttleOpts} from 'lavamoat-core' */

/**
 * @param {LavaMoatScuttleOpts} scuttleGlobalThis
 * @param {Object} [options]
 * @param {string} [options.chunkLoaderName='webpackChunk'] The name of the global that loads chunks
 * @returns {LavaMoatScuttleOpts}
 */
exports.adjustScuttleConfig = (
  scuttleGlobalThis,
  { chunkLoaderName = 'webpackChunk' } = {}
) => {
  scuttleGlobalThis = { ...scuttleGlobalThis }
  if (Array.isArray(scuttleGlobalThis.exceptions)) {
    scuttleGlobalThis.exceptions = scuttleGlobalThis.exceptions.map(
      /**
       * Convert regex to string
       *
       * @param {string | RegExp} e
       * @returns {string}
       */
      (e) => e.toString()
    )
  } else {
    scuttleGlobalThis.exceptions = []
  }
  scuttleGlobalThis.exceptions.push(chunkLoaderName)
  return scuttleGlobalThis
}
