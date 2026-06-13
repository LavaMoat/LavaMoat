import {
  makeReadNowPowers,
  makeReadPowers,
} from '@endo/compartment-mapper/node-powers.js'
import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

/**
 * @import {
 *   LavaMoatReadPowers,
 *   MakeReadPowersOptions,
 *   WithRawPowers
 * } from "../types.js"
 */

/**
 * Creates {@link LavaMoatReadPowers} from raw powers.
 *
 * Defaults to using the `node:fs`, `node:url`, `node:crypto`, and `node:path`
 * modules.
 *
 * @param {Partial<WithRawPowers>} [options]
 * @returns {LavaMoatReadPowers}
 */
const createReadPowers = ({
  fs = nodeFs,
  url = nodeUrl,
  crypto = nodeCrypto,
  path = nodePath,
} = {}) => ({
  // gives us maybeRead
  ...makeReadPowers({
    fs,
    url,
    crypto,
    path,
  }),

  // gives us required "read now" powers
  ...makeReadNowPowers({
    fs,
    url,
    crypto,
    path,
  }),
})

/**
 * Default read powers for Endo
 *
 * @type {LavaMoatReadPowers}
 */
export const defaultReadPowers = createReadPowers()

/**
 * Creates a {@link LavaMoatReadPowers} object from raw powers.
 *
 * If any "raw powers" (`fs`, `url`, `crypto`, `path`) are provided, they take
 * precedence over `readPowers`. Any missing "raw powers" are filled with
 * Node.js built-in modules.
 *
 * @param {MakeReadPowersOptions} options
 * @returns {LavaMoatReadPowers}
 */
export const makeLavaMoatReadPowers = (options) => {
  const { readPowers, ...rest } = options
  // FIXME: it might be possible that the way endo uses node:url won't work consistently
  // with non-default fs passed in. Some assumptions about path resolution are used in url
  if ('fs' in rest || 'url' in rest || 'crypto' in rest || 'path' in rest) {
    return createReadPowers(rest)
  }
  return readPowers ?? defaultReadPowers
}
