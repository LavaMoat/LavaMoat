/**
 * The obligatory junk drawer of utilities.
 *
 * @packageDocumentation
 */
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const { isArray: isArray_ } = Array
const { freeze } = Object

/**
 * @import {ReadNowPowers, ReadNowPowersProp} from '@endo/compartment-mapper'
 * @import {SetNonNullable} from 'type-fest'
 */

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
  url instanceof URL
    ? url.href
    : url.startsWith('file:')
      ? url
      : pathToFileURL(url).href

/**
 * Type guard for an object.
 *
 * @param {unknown} value
 * @returns {value is object}
 * @internal
 */
export const isObject = (value) => value !== null && typeof value === 'object'

/**
 * Type guard for a non-array object
 *
 * @param {unknown} value
 * @returns {value is object & {length?: never}}
 * @internal
 */
export const isObjectyObject = (value) => isObject(value) && !isArray(value)

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
 * @remarks
 * This exists so that `isArray` needn't be dereferenced from the global
 * `Array`.
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
 * If trying to perform the opposite assertion, use `!(prop in value)` instead
 * of `!has(value, prop)`
 *
 * Don't try to use this with union types.
 *
 * @template {object} [T=object] Some object. Default is `object`
 * @template {string} [const K=string] Some property which might be in `T`.
 *   Default is `string`
 * @param {T} obj Some object
 * @param {K} prop Some property which might be in `obj`
 * @returns {obj is Omit<T, K> & {[key in K]: SetNonNullable<T, K>}}
 * @see {@link https://github.com/microsoft/TypeScript/issues/44253}
 */
export const hasValue = (obj, prop) => {
  return (
    /**
     * TODO:
     *
     * - [ ] Use `Object.hasOwn`; this type def should eventually live in
     *   `@lavamoat/types` (it's currently a declaration in core and not
     *   exported) while it does not exist in TypeScript libs.
     */

    prop in obj &&
    /**
     * @privateRemarks
     * I'm not sure exactly why this is needed. `prop in obj` does not imply
     * `obj[prop]` here, so you'd get a "`K` cannot be used to index `T`" error.
     * There's no relationship between type args `T` and `K`, but it's
     * surprising to me that `prop in obj` does not establish the relationship.
     * `obj[prop]` can be `undefined` even if `prop in obj` is `true`, which
     * might be the reason?
     * @type {any}
     */ (obj)[prop] !== undefined &&
    obj[prop] !== null
  )
}

/**
 * Converts a boolean `dev` to a set of conditions (Endo option)
 *
 * @param {boolean} [dev]
 * @returns {Set<string>}
 */
export const devToConditions = (dev) =>
  dev ? new Set(['development']) : new Set()

/**
 * Ordered array of every property in {@link ReadNowPowers} which is _required_.
 *
 * @satisfies {Readonly<
 *   {
 *     [K in ReadNowPowersProp]-?: {} extends Pick<ReadNowPowers, K> ? never : K
 *   }[ReadNowPowersProp][]
 * >}
 */
const requiredReadNowPowersProps = freeze(
  /** @type {const} */ (['fileURLToPath', 'isAbsolute', 'maybeReadNow'])
)

/**
 * Returns `true` if `value` is a {@link ReadNowPowers}
 *
 * @param {unknown} value
 * @returns {value is ReadNowPowers}
 */
export const isReadNowPowers = (value) =>
  !!(
    value &&
    isObjectyObject(value) &&
    requiredReadNowPowersProps.every(
      (prop) =>
        prop in value &&
        typeof (/** @type {any} */ (value)[prop]) === 'function'
    )
  )

/**
 * Given a filepath, displays it as relative or absolute depending on which is
 * fewer characters. Ergo, the "human-readable" path.
 *
 * @param {string | URL} filepath
 * @returns {string}
 * @internal
 */
export const hrPath = (filepath) => {
  if (!isString(filepath)) {
    filepath = fileURLToPath(filepath)
  }
  if (path.isAbsolute(filepath)) {
    const relativePath = path.relative(process.cwd(), filepath)
    if (relativePath && relativePath.length < filepath.length) {
      return relativePath
    }
  } else {
    const absolutePath = path.resolve(filepath)
    if (absolutePath.length < filepath.length) {
      return absolutePath
    }
  }
  return filepath
}
