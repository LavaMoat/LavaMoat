import { makeReadNowPowers } from '@endo/compartment-mapper/node-powers.js'
import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

/**
 * @import {SetRequired} from 'type-fest';
 * @import {ReadNowPowers,  FsInterface,  UrlInterface,  CryptoInterface, PathInterface} from '@endo/compartment-mapper'
 * @import {WithRawReadPowers} from './types.js';
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
 * Creates a `ReadNowPowers` object from a `FsInterface` object (and optionally
 * other powers)
 *
 * @param {FsInterface} fs
 * @param {UrlInterface} [url]
 * @param {PathInterface} [path]
 * @param {CryptoInterface} [crypto]
 * @returns {ReadNowPowers}
 */
export const makeReadPowers = (
  fs,
  url = nodeUrl,
  path = nodePath,
  crypto = nodeCrypto
) => {
  if (fs === nodeFs) {
    return defaultReadPowers
  }
  return makeReadNowPowers({
    fs,
    url,
    crypto,
    path,
  })
}
