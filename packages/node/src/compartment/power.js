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
  fs: nodeFs,
  url: nodeUrl,
  crypto: nodeCrypto,
  path: nodePath,
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
  const { fs, url = nodeUrl, path = nodePath, crypto = nodeCrypto } = options
  if (fs) {
    return makeReadNowPowers({
      fs,
      url,
      crypto,
      path,
    })
  }
  if (readPowers) {
    return readPowers
  }
  return defaultReadPowers
}
