/**
 * The obligatory junk drawer of utilities.
 *
 * @remraks
 * This is an anti-pattern. Or so I've heard.
 *
 * TODO: Everything here should support capabilities in one form or another
 *
 * @packageDocumentation
 */
import chalk from 'chalk'
import { default as nodePath } from 'node:path'
import nodeUrl from 'node:url'
import {
  DEFAULT_POLICY_DEBUG_FILENAME,
  DEFAULT_POLICY_OVERRIDE_FILENAME,
} from './constants.js'
import { assertAbsolutePath } from './fs.js'

const { isArray: isArray_ } = Array
const { freeze, keys } = Object

/**
 * @import {FileURLToPathFn, ReadNowPowers} from '@endo/compartment-mapper'
 * @import {RequiredReadNowPowers} from './internal.js'
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
export const toEndoURL = (url) =>
  url instanceof URL
    ? url.href
    : url.startsWith('file://')
      ? url
      : nodeUrl.pathToFileURL(url).href

/**
 * Type guard for an object.
 *
 * @param {unknown} value
 * @returns {value is object}
 * @internal
 */
export const isObject = (value) => Object(value) === value

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
 */
export const isFunction = (value) => typeof value === 'function'

/**
 * Given a filepath, displays it as relative or absolute depending on which is
 * fewer characters. Ergo, the "human-readable" path.
 *
 * If relative to the current directory, it will be prefixed with `./`.
 *
 * @param {string | URL} filepath Path to display
 * @returns {string} Human-readable path
 * @internal
 */
export const hrPath = (filepath) => {
  filepath = toPath(filepath)
  if (nodePath.isAbsolute(filepath)) {
    const relativePath = nodePath.relative(process.cwd(), filepath)
    if (relativePath.length < filepath.length) {
      filepath = relativePath.startsWith('..')
        ? relativePath
        : `./${relativePath}`
    }
  } else {
    const absolutePath = nodePath.resolve(filepath)
    if (absolutePath.length < filepath.length) {
      filepath = absolutePath
    }
  }
  return chalk.greenBright(filepath)
}

/**
 * For display of package names or canonical names.
 *
 * @param {string} name
 * @returns {string}
 * @internal
 */
export const hrLabel = (name) => {
  return name.includes('>')
    ? name.split('>').map(hrLabel).join(chalk.magenta('>'))
    : chalk.magentaBright(name)
}

/**
 * Type guard for a "path-like" value
 *
 * @param {unknown} value
 * @returns {value is string | URL}
 */
export const isPathLike = (value) => isString(value) || value instanceof URL

/**
 * Converts a path-like value to a string
 *
 * @param {string | URL} value Path-like value. If a string, should have a
 *   `file://` scheme
 * @param {FileURLToPathFn} [fileURLToPath] `fileURLToPath` implementation
 * @returns {string} A filepath
 */
export const toPath = (value, fileURLToPath = nodeUrl.fileURLToPath) => {
  return value instanceof URL || value.startsWith('file://')
    ? fileURLToPath(value)
    : value
}

/**
 * Formats "code"; use when referring to code or configuration
 *
 * @param {string} value
 * @returns {string}
 */
export const hrCode = (value) => {
  return chalk.bgGrey.whiteBright(value)
}

/**
 * Given path to a policy file, returns the sibling path to the policy override
 * file
 *
 * @param {string | URL} policyPath
 * @returns {string}
 */
export const makeDefaultPolicyOverridePath = (policyPath) => {
  const path = toPath(policyPath)
  assertAbsolutePath(
    path,
    `${hrCode('policyPath')} must be an absolute path; got ${path}`
  )
  const policyDir = nodePath.dirname(path)
  return nodePath.join(policyDir, DEFAULT_POLICY_OVERRIDE_FILENAME)
}

/**
 * Given path to a policy file, returns the sibling path to the policy debug
 * file
 *
 * @param {string | URL} policyPath
 * @returns {string}
 */
export const makeDefaultPolicyDebugPath = (policyPath) => {
  const path = toPath(policyPath)
  assertAbsolutePath(
    path,
    `${hrCode('policyPath')} must be an absolute path; got ${path}`
  )
  const policyDir = nodePath.dirname(path)
  return nodePath.join(policyDir, DEFAULT_POLICY_DEBUG_FILENAME)
}
