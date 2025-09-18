import { makeReadNowPowers } from '@endo/compartment-mapper/node-powers.js'
import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

/**
 * @import {ReadNowPowers} from '@endo/compartment-mapper'
 * @import {MakeReadPowersOptions} from '../types.js';
 */

/**
 * Default read powers for Endo
 *
 * @type {ReadNowPowers}
 */
export const defaultReadPowers = makeReadNowPowers({
  crypto: nodeCrypto,
  fs: nodeFs,
  path: nodePath,
  url: nodeUrl,
})

/**
 * Creates a {@link ReadNowPowers} object from raw powers.
 *
 * If option `fs` is present, it takes precedence over `readPowers`.
 *
 * @param {MakeReadPowersOptions} options
 * @returns {ReadNowPowers}
 */
export const makeReadPowers = (options) => {
  const { readPowers } = options
  const { crypto = nodeCrypto, fs, path = nodePath, url = nodeUrl } = options
  if (fs) {
    return makeReadNowPowers({
      crypto,
      fs,
      path,
      url,
    })
  }
  if (readPowers) {
    return readPowers
  }
  return defaultReadPowers
}
