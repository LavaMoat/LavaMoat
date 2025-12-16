/**
 * The obligatory junk drawer of utilities.
 *
 * @remraks
 * This is an anti-pattern. Or so I've heard.
 *
 * @packageDocumentation
 */
import nodeUrl from 'node:url'
import { assertAbsolutePath } from './fs.js'

/**
 * @import {FileURLToPathFn, ReadNowPowers} from '@endo/compartment-mapper'
 * @import {RequiredReadNowPowers} from './internal.js'
 * @import {SetNonNullable} from 'type-fest'
 * @import {FileUrlString} from './types.js'
 */
const { isArray: isArray_ } = Array
const { freeze, keys } = Object

/**
 * Converts a {@link URL} or `string` to a URL-like `string` starting with the
 * protocol.
 *
 * If `url` is a `string`, it is expected to be a path.
 *
 * @remarks
 * This is the format that `@endo/compartment-mapper` often expects.
 * @param {URL | string} url URL or path
 * @returns {FileUrlString} URL-like string
 * @internal
 */
export const toFileURLString = (url) =>
  /** @type {FileUrlString} */ (
    url instanceof URL
      ? url.href
      : url.startsWith('file://')
        ? url
        : nodeUrl.pathToFileURL(url).href
  )

/**
 * Type guard for an object.
 *
 * This includes functions and arrays, but not `null`.
 *
 * @param {unknown} value
 * @returns {value is object}
 * @internal
 */
export const isObject = (value) => Object(value) === value

/**
 * Type guard for a non-array object. Functions OK
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
 * @internal
 * @see {@link https://github.com/microsoft/TypeScript/issues/44253}
 */
export const hasValue = (obj, prop) => {
  return (
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
 * TODO: Evaluate if this is needed. `dev` option should be un-deprecated
 *
 * @param {boolean} [dev=false] Default is `false`
 * @returns {Set<string>}
 * @internal
 */
export const devToConditions = (dev) =>
  dev ? new Set(['development']) : new Set()

/**
 * Ordered array of every property in {@link ReadNowPowers} which is _required_.
 *
 * @satisfies {RequiredReadNowPowers}
 * @internal
 */
const REQUIRED_READ_NOW_POWERS = freeze(
  /** @type {const} */ (['fileURLToPath', 'isAbsolute', 'maybeReadNow'])
)

/**
 * Returns `true` if `value` is a {@link ReadNowPowers}
 *
 * @param {unknown} value
 * @returns {value is ReadNowPowers}
 * @internal
 */
export const isReadNowPowers = (value) =>
  isObjectyObject(value) &&
  REQUIRED_READ_NOW_POWERS.every(
    (prop) => hasValue(value, prop) && isFunction(value[prop])
  )

/**
 * A forgiving {@link Object.keys} returning `defaultKeys` if `value` is falsy.
 *
 * @param {object} [value] Object value to get keys of
 * @param {string[]} [defaultKeys=[]] Default is `[]`
 * @returns {string[]}
 * @internal
 */
export const keysOr = (value, defaultKeys = []) =>
  value ? keys(value) : defaultKeys

/**
 * Type guard for a function
 *
 * Note: This is _not_ suitable for use with constructors.
 *
 * @param {unknown} value
 * @returns {value is (...args: any[]) => any}
 * @internal
 */
export const isFunction = (value) => typeof value === 'function'

/**
 * Type guard for a "path-like" value
 *
 * @param {unknown} value
 * @returns {value is string | URL}
 * @internal
 */
export const isPathLike = (value) => isString(value) || value instanceof URL

/**
 * Converts a path-like value to a string
 *
 * @param {string | URL} value Path-like value. If a string, should have a
 *   `file://` scheme
 * @param {FileURLToPathFn} [fileURLToPath] `fileURLToPath` implementation
 * @returns {string} A filepath
 * @internal
 */
export const toPath = (value, fileURLToPath = nodeUrl.fileURLToPath) => {
  return value instanceof URL || value.startsWith('file://')
    ? fileURLToPath(value)
    : value
}

/**
 * Converts a path-like value to an absolute path, asserting that it is
 * absolute.
 *
 * @param {string | URL} pathLike Path-like value to convert to an absolute
 *   path.
 * @param {string} [assertionMessage] Custom assertion message
 * @returns {string} Absolute path
 * @internal
 */
export const toAbsolutePath = (pathLike, assertionMessage) => {
  const path = toPath(pathLike)
  assertAbsolutePath(
    path,
    assertionMessage ?? `Expected an absolute path; got ${path}`
  )
  return path
}

// #region to-keypath
/**
 * Matches a string that can be displayed as an integer when converted to a
 * string (via `toString()`). This would represent the index of an array.
 *
 * It may not be a
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger safe integer},
 * but it's an integer.
 */
const INT_STRING_REGEXP = /^(?:0|[1-9][0-9]*)$/

/**
 * Anything matching this will need to be in
 */
const DOT_NOTATION_ALLOWED = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/

/**
 * Matches a string wrapped in single or double quotes
 */
const WRAPPED_QUOTE_REGEXP = /^["'](?<content>.+)["']$/

/**
 * Returns `true` if `key` can be coerced to an integer, which will cause it to
 * be wrapped in brackets (`[${key}]`) when used as a key in an object
 *
 * @param {string} key Some string
 * @returns {boolean} `true` if `key` can be coerced to an integer
 */
const isIntegerLike = (key) => INT_STRING_REGEXP.test(key)

/**
 * Converts a "keypath" array to a string using dots or braces as appropriate
 *
 * @template {readonly string[]} const T Array of strings
 * @param {T} path "keypath" array
 * @returns {string}
 */
export const toKeypath = (path) => {
  if (!path?.length) {
    return ''
  }
  return path.reduce((output, key) => {
    key = key.replace(WRAPPED_QUOTE_REGEXP, '$<content>')

    if (isIntegerLike(key)) {
      return `${output}[${key}]`
    }
    return DOT_NOTATION_ALLOWED.test(key)
      ? `${output}.${key}`
      : `${output}["${key}"]`
  })
}
// #endregion

/**
 * Returns the singular or plural form of a word based on count.
 *
 * @example
 *
 * ```js
 * pluralize(1, 'item') // => 'item'
 * pluralize(0, 'item') // => 'items'
 * pluralize(5, 'item') // => 'items'
 * pluralize(2, 'ox', 'oxen') // => 'oxen'
 * ```
 *
 * @param {number} count The count to check
 * @param {string} singular The singular form of the word
 * @param {string} [plural] The plural form (defaults to `singular + 's'`)
 * @returns {string} The appropriate form of the word
 * @internal
 */
export const pluralize = (count, singular, plural = `${singular}s`) =>
  count === 1 ? singular : plural
