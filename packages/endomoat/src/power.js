import { makeSyncReadPowers as endoMakeReadPowers } from '@endo/compartment-mapper/node-powers.js'
import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

/**
 * @import {SetRequired} from 'type-fest';
 * @import {SyncReadPowers, FsAPI, UrlAPI, CryptoAPI, PathAPI} from '@endo/compartment-mapper'
 * @import {WithReadPowers} from './types.js';
 */

/**
 * Default read powers for Endo
 *
 * @type {SyncReadPowers}
 */
export const defaultReadPowers = endoMakeReadPowers({
  fs: nodeFs,
  url: nodeUrl,
  crypto: nodeCrypto,
  path: nodePath,
})

/**
 * Creates a `SyncReadPowers` object from a `FsAPI` object (and optionally other
 * powers)
 *
 * @param {FsAPI} fs
 * @param {UrlAPI} [url]
 * @param {PathAPI} [path]
 * @param {CryptoAPI} [crypto]
 * @returns {SyncReadPowers}
 */
export function makeReadPowers(
  fs,
  url = nodeUrl,
  path = nodePath,
  crypto = nodeCrypto
) {
  if (fs === nodeFs) {
    return defaultReadPowers
  }
  return endoMakeReadPowers({
    fs,
    url,
    crypto,
    path,
  })
}
