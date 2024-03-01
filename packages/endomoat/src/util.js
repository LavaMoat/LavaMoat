import nodeFs from 'node:fs'
import { Module } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Resolves a module from a given directory
 *
 * @overload
 * @param {string} cwd - The directory to resolve from
 * @param {string} moduleId - The module to resolve
 * @returns {string} The resolved module
 */

/**
 * Resolves a module from the current working directory
 *
 * @overload
 * @param {string} moduleId - The module to resolve
 * @returns {string} The resolved module
 */

/**
 * Resolves a module from the given directory or from the current working
 * directory
 *
 * @param {string} cwdOrModuleId - The directory to resolve from or the module
 *   to resolve
 * @param {string} [allegedModuleId] - The module to resolve
 * @returns {string} The resolved module
 */
export function resolveFrom(cwdOrModuleId, allegedModuleId) {
  const moduleId = allegedModuleId ? allegedModuleId : cwdOrModuleId
  let cwd = allegedModuleId ? cwdOrModuleId : process.cwd()

  if (!path.isAbsolute(cwd)) {
    cwd = path.resolve(cwd)
  }

  const require = Module.createRequire(path.join(cwd, 'dummy.js'))
  return require.resolve(moduleId)
}

/**
 * Reads a JSON file
 *
 * @template [T=unknown] Default is `unknown`
 * @param {string | URL} filepath
 * @param {{ fs?: import('@endo/compartment-mapper').FsAPI }} opts
 * @returns {Promise<T>}
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
 * @param {string} filepath
 * @param {import('type-fest').Jsonifiable} data
 * @param {{ fs?: import('./types.js').WritableFsAPI }} opts
 * @returns {Promise<void>}
 */
export async function writeJson(filepath, data, { fs = nodeFs } = {}) {
  await fs.promises.mkdir(path.dirname(filepath), { recursive: true })
  await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2))
}

/**
 * @param {unknown} value
 * @returns {value is import('@endo/compartment-mapper').FsAPI}
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
