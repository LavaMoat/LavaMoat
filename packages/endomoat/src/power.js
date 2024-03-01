import { makeReadPowers as endoMakeReadPowers } from '@endo/compartment-mapper/node-powers.js'
import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodeUrl from 'node:url'
import { isFsAPI } from './util.js'

/**
 * Default read powers for Endo
 *
 * @type {import('@endo/compartment-mapper').ReadPowers}
 */
export const defaultReadPowers = endoMakeReadPowers({
  fs: nodeFs,
  url: nodeUrl,
  crypto: nodeCrypto,
})

/**
 * Creates a `ReadPowers` object from a `ReadFn` function
 *
 * @overload
 * @param {import('@endo/compartment-mapper').ReadFn} readFn
 * @returns {import('@endo/compartment-mapper').ReadPowers}
 */

/**
 * Creates a `ReadPowers` object from a `FsAPI` object (and optionally other
 * powers)
 *
 * @overload
 * @param {import('@endo/compartment-mapper').FsAPI} fs
 * @param {import('@endo/compartment-mapper').UrlAPI} [url]
 * @param {import('@endo/compartment-mapper').CryptoAPI} [crypto]
 * @returns {import('@endo/compartment-mapper').ReadPowers}
 */

/**
 * Returns default set of `ReadPowers` if none provided; otherwise returns the
 * identity
 *
 * @overload
 * @param {import('@endo/compartment-mapper').ReadPowers} [readPowers]
 * @returns {import('@endo/compartment-mapper').ReadPowers}
 */

/**
 * Creates a `ReadPowers` object from various sources or nothing
 *
 * @overload
 * @param {import('@endo/compartment-mapper').FsAPI
 *   | import('@endo/compartment-mapper').ReadFn
 *   | import('@endo/compartment-mapper').ReadPowers} [value]
 * @param {import('@endo/compartment-mapper').UrlAPI} [url]
 * @param {import('@endo/compartment-mapper').CryptoAPI} [crypto]
 * @returns {import('@endo/compartment-mapper').ReadPowers}
 */

/**
 * Creates a `ReadPowers` object from various sources or nothing
 *
 * @param {import('@endo/compartment-mapper').FsAPI
 *   | import('@endo/compartment-mapper').ReadFn
 *   | import('@endo/compartment-mapper').ReadPowers} [value]
 * @param {import('@endo/compartment-mapper').UrlAPI} [url]
 * @param {import('@endo/compartment-mapper').CryptoAPI} [crypto]
 * @returns {import('@endo/compartment-mapper').ReadPowers}
 */
export function makeReadPowers(value, url = nodeUrl, crypto = nodeCrypto) {
  if (isFsAPI(value)) {
    if (value === nodeFs) {
      return defaultReadPowers
    }
    return endoMakeReadPowers({
      fs: value,
      url,
      crypto,
    })
  }
  if (typeof value === 'function') {
    return { read: value, canonical: async (x) => x }
  }
  return value ?? defaultReadPowers
}
