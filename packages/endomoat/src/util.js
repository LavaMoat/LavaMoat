import nodeFs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/**
 * Reads a JSON file
 *
 * @template {import('type-fest').JsonValue} [T=import('type-fest').JsonValue]
 *   Default is `import('type-fest').JsonValue`
 * @param {string | URL} filepath
 * @param {{ fs?: import('@endo/compartment-mapper').FsAPI }} opts
 * @returns {Promise<T>} JSON data
 */
export async function readJsonFile(filepath, { fs = nodeFs } = {}) {
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
 * @param {import('type-fest').Jsonifiable} data JSON data
 * @param {{ fs?: import('./types.js').WritableFsAPI }} opts Options
 * @returns {Promise<void>}
 */
export async function writeJson(filepath, data, { fs = nodeFs } = {}) {
  await fs.promises.mkdir(path.dirname(filepath), { recursive: true })
  await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2))
}

/**
 * Type guard for an `FsAPI` object
 *
 * @param {unknown} value Value to check
 * @returns {value is import('@endo/compartment-mapper').FsAPI} `true` if
 *   `value` is an `FsAPI`
 */
export function isFsAPI(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'promises' in value &&
      value.promises &&
      typeof value.promises === 'object' &&
      'readFile' in value.promises &&
      typeof value.promises.readFile === 'function' &&
      'realpath' in value.promises &&
      typeof value.promises.realpath === 'function'
  )
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
export function toURLString(url) {
  return url instanceof URL ? `${url}` : `${pathToFileURL(url)}`
}
