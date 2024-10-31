/**
 * The obligatory junk drawer of utilities.
 *
 * @packageDocumentation
 */

import nodeFs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { isArray: isArray_ } = Array

/**
 * @import {FsInterface} from '@endo/compartment-mapper'
 * @import {Jsonifiable, SetNonNullable} from 'type-fest'
 * @import {WritableFsInterface} from './types.js'
 */

/**
 * Reads a JSON file
 *
 * @template [T=unknown] Default is `unknown`
 * @param {string | URL} filepath
 * @param {{ fs?: FsInterface }} opts
 * @returns {Promise<T>} JSON data
 * @internal
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
 * @internal
 */
export const writeJson = async (filepath, data, { fs = nodeFs } = {}) => {
  await fs.promises.mkdir(path.dirname(filepath), { recursive: true })
  await fs.promises.writeFile(filepath, JSON.stringify(data, null, 2))
}

/**
 * Converts a {@link URL} or `string` to a URL-like `string` starting with the
 * protocol.
 *
 * If `url` is a `string`, it is expected to be a path.
 *
 * @remarks
 * This is the format that `@endo/compartment-mapper` often expects.
 * @param {URL | string} url URL or path
 * @returns {string} URL-like string
 * @internal
 */
export const toURLString = (url) =>
  url instanceof URL ? url.href : pathToFileURL(url).href

/**
 * Type guard for an object.
 *
 * @param {unknown} value
 * @returns {value is object}
 * @internal
 */
export const isObject = (value) => value !== null && typeof value === 'object'

/**
 * Type guard for a string
 *
 * @param {unknown} value
 * @returns {value is string}
 * @internal
 */
export const isString = (value) => typeof value === 'string'

/**
 * Type guard for an array
 *
 * @param {unknown} value
 * @returns {value is any[]}
 * @internal
 */
export const isArray = (value) => isArray_(value)

/**
 * Type guard for a boolean
 *
 * @param {unknown} value
 * @returns {value is boolean}
 * @internal
 */
export const isBoolean = (value) => typeof value === 'boolean'

/**
 * Type guard for an object having a property which is not `null` nor
 * `undefined`.
 *
 * @remarks
 * If trying to perform the opposite assertion, use `!(prop in value)` instead
 * of `!has(value, prop)`
 *
 * TODO:
 *
 * - [ ] Use `Object.hasOwn`; this type def should eventually live in
 *   `@lavamoat/types` (it's currently a declaration in core and not exported)
 *   while it does not exist in TypeScript libs.
 *
 * @template {object} [T=object] Default is `object`
 * @template {string} [const K=string] Default is `string`
 * @param {T} value
 * @param {K} prop
 * @returns {value is Omit<T, K> & {[key in K]: SetNonNullable<T, K>}}
 * @see {@link https://github.com/microsoft/TypeScript/issues/44253}
 */
export const hasValue = (value, prop) => {
  return (
    prop in value &&
    /** @type {T & Record<K, unknown>} */ (value)[prop] !== undefined &&
    value[prop] !== null
  )
}
