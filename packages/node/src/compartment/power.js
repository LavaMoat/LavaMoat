/**
 * Provides {@link ReadNowPowers} backed by Node.js builtins.
 *
 * This intentionally does not use `@endo/compartment-mapper/node-powers.js`,
 * which imports `@endo/hex`. `@endo/hex` calls `harden()` at module load, and
 * SES' `repairIntrinsics()` refuses to run once a prior `harden` has been
 * installed—which would break the preamble.
 *
 * @packageDocumentation
 */

import nodeCrypto from 'node:crypto'
import nodeFs from 'node:fs'
import { createRequire } from 'node:module'
import nodePath from 'node:path'
import nodeUrl from 'node:url'

/**
 * @import {
 *   CanonicalFn,
 *   CryptoInterface,
 *   FileUrlString,
 *   FsInterface,
 *   HashFn,
 *   MaybeReadFn,
 *   MaybeReadNowFn,
 *   PathInterface,
 *   ReadFn,
 *   ReadNowPowers,
 *   RequireResolveFn,
 *   UrlInterface
 * } from '@endo/compartment-mapper'
 * @import {MakeReadPowersOptions} from '../types.js'
 */

/**
 * Returns `true` if `error` indicates a missing file or a directory where a
 * file was expected.
 *
 * @param {unknown} error
 * @returns {boolean}
 */
const isNotFoundError = (error) => {
  const { code } = /** @type {NodeJS.ErrnoException} */ (error)
  return code === 'ENOENT' || code === 'EISDIR'
}

/**
 * Creates a {@link ReadNowPowers} object from Node.js-compatible interfaces.
 *
 * @param {object} powers
 * @param {FsInterface} powers.fs
 * @param {UrlInterface} powers.url
 * @param {CryptoInterface} powers.crypto
 * @param {PathInterface} powers.path
 * @returns {ReadNowPowers<FileUrlString>}
 */
const makeNodeReadNowPowers = ({ fs, url, crypto, path }) => {
  const { fileURLToPath, pathToFileURL } = url
  const { isAbsolute } = path

  let readMutex = Promise.resolve()

  /**
   * Reads are serialized to avoid exhausting file descriptors.
   *
   * @type {ReadFn}
   */
  const read = async (location) => {
    const prior = readMutex
    /** @type {() => void} */
    let release = () => {}
    readMutex = new Promise((resolve) => {
      release = resolve
    })
    await prior
    try {
      return await fs.promises.readFile(fileURLToPath(location))
    } finally {
      release()
    }
  }

  /** @type {MaybeReadFn} */
  const maybeRead = async (location) => {
    try {
      return await read(location)
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined
      }
      throw error
    }
  }

  /** @type {MaybeReadNowFn} */
  const maybeReadNow = (location) => {
    try {
      return fs.readFileSync(fileURLToPath(location))
    } catch (error) {
      if (isNotFoundError(error)) {
        return undefined
      }
      throw error
    }
  }

  /** @type {RequireResolveFn} */
  const requireResolve = (from, specifier, options) =>
    createRequire(from).resolve(specifier, options)

  /**
   * Resolves symlinks. A trailing slash (denoting a directory) is preserved,
   * and the original location is returned if it cannot be resolved.
   *
   * @type {CanonicalFn<FileUrlString>}
   */
  const canonical = async (location) => {
    try {
      if (location.endsWith('/')) {
        const realPath = await fs.promises.realpath(
          fileURLToPath(location).replace(/\/$/, '')
        )
        return /** @type {FileUrlString} */ (`${pathToFileURL(realPath).href}/`)
      }
      const realPath = await fs.promises.realpath(fileURLToPath(location))
      return /** @type {FileUrlString} */ (pathToFileURL(realPath).href)
    } catch {
      return location
    }
  }

  /**
   * `digest()` may return a plain `Uint8Array` if a custom `crypto` was
   * provided, so it is wrapped in a `Buffer` before hex-encoding.
   *
   * @type {HashFn}
   */
  const computeSha512 = (bytes) =>
    Buffer.from(crypto.createHash('sha512').update(bytes).digest()).toString(
      'hex'
    )

  return {
    read,
    maybeRead,
    maybeReadNow,
    fileURLToPath,
    pathToFileURL,
    canonical,
    computeSha512,
    requireResolve,
    isAbsolute,
  }
}

/**
 * Default read powers for Endo
 *
 * @type {ReadNowPowers}
 */
export const defaultReadPowers = makeNodeReadNowPowers({
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
  // FIXME: it might be possible that the way endo uses node:url won't work consistently
  // with non-default fs passed in. Some assumptions about path resolution are used in url
  if (fs) {
    return makeNodeReadNowPowers({ fs, url, crypto, path })
  }
  if (readPowers) {
    return readPowers
  }
  return defaultReadPowers
}
