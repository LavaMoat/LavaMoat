import { makeReadPowers as endoMakeReadPowers } from '@endo/compartment-mapper/node-powers.js'
import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import nodeUrl from 'node:url'

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
 * Creates a `ReadPowers` object from a `ReadFn` and optionally other powers
 *
 * @param {import('@endo/compartment-mapper').FsAPI} fs
 * @returns {import('@endo/compartment-mapper').ReadPowers}
 */
export function makeReadPowers(fs = nodeFs) {
  return endoMakeReadPowers({
    fs,
    url: nodeUrl,
    crypto: nodeCrypto,
  })
}
