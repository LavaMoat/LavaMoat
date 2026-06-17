/**
 * Small filesystem helpers.
 *
 * @packageDocumentation
 */

import nodeFs from 'node:fs/promises'

/**
 * @import {JsonValue} from 'type-fest'
 */

/**
 * Reads and parses a JSON file.
 *
 * @param {string | URL} filepath Path to a JSON file
 * @param {{ readFile?: typeof nodeFs.readFile }} [options] Options
 * @returns {Promise<JsonValue>} Parsed JSON
 * @internal
 */
export const readJsonFile = async (
  filepath,
  { readFile = nodeFs.readFile } = {}
) => {
  const raw = await readFile(filepath, 'utf8')
  return JSON.parse(raw)
}

/**
 * Returns `true` if a path exists and is readable.
 *
 * @param {string | URL} filepath Path to check
 * @param {{ access?: typeof nodeFs.access }} [options] Options
 * @returns {Promise<boolean>}
 * @internal
 */
export const pathExists = async (filepath, { access = nodeFs.access } = {}) => {
  try {
    await access(filepath)
    return true
  } catch {
    return false
  }
}
