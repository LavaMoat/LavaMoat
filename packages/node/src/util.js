import nodeFs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * @import {FsInterface} from '@endo/compartment-mapper'
 * @import {Jsonifiable} from 'type-fest'
 * @import {WritableFsInterface} from './types.js'
 */

/**
 * Reads a JSON file
 *
 * @template [T=unknown] Default is `unknown`
 * @param {string | URL} filepath
 * @param {{ fs?: FsInterface }} opts
 * @returns {Promise<T>} JSON data
 */
export const readJsonFile = async (filepath, { fs = nodeFs } = {}) => {
  if (filepath instanceof URL) {
    filepath = fileURLToPath(filepath)
  }
  const json = await fs.promises.readFile(filepath)
  return JSON.parse(`${json}`)
}

/**
 * Writes a JSON file
 *
 * Creates the destination directory if it does not exist
 *
 * @param {string} filepath Path to write to
 * @param {Jsonifiable} data JSON data
 * @param {{ fs?: WritableFsInterface }} opts Options
 * @returns {Promise<void>}
 */
export const writeJson = async (filepath, data, { fs = nodeFs } = {}) => {
  await fs.promises.mkdir(path.dirname(filepath), { recursive: true })
  await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2))
}

/**
 * Converts a `URL` or `string` to a URL-like `string`.
 *
 * If `url` is a `string`, it is expected to be a path.
 *
 * @remarks
 * This is the format that `@endo/compartment-mapper` often expects.
 * @param {URL | string} url URL or path
 * @returns {string} URL-like string
 */
export const toURLString = (url) =>
  url instanceof URL ? `${url}` : `${pathToFileURL(url)}`
