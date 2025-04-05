/**
 * Utilities for reading and validating LavaMoat policies.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * TODO: Capabilities are inconsistent
 *
 * @packageDocumentation
 */

import { jsonStringifySortedPolicy, mergePolicy } from 'lavamoat-core'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import * as constants from './constants.js'
import { readJsonFile } from './fs.js'
import { log } from './log.js'
import {
  hasValue,
  hrPath,
  isObjectyObject,
  isPathLike,
  isString,
  toPath,
} from './util.js'

/**
 * @import {RootPolicy, LavaMoatPolicy, LavaMoatPolicyDebug} from 'lavamoat-core'
 * @import {LoadPoliciesOptions, WritableFsInterface} from './types.js'
 * @import {ReadPolicyOptions, ReadPolicyOverrideOptions} from './internal.js'
 */

/**
 * Reads a `policy.json` from disk
 *
 * @param {string | URL} policyPath Path to policy
 * @param {ReadPolicyOptions} [options] Options
 * @returns {Promise<LavaMoatPolicy>}
 * @internal
 */
export const readPolicy = async (
  policyPath,
  { readFile = nodeFs.promises.readFile } = {}
) => {
  /** @type {unknown} */
  let allegedPolicy
  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    allegedPolicy = await readJsonFile(policyPath, { readFile })
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(
        `Invalid LavaMoat policy at ${hrPath(policyPath)}; failed to parse JSON`,
        { cause: err }
      )
    }
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      throw new Error(
        `LavaMoat policy file not found at ${hrPath(policyPath)}`,
        { cause: err }
      )
    } else {
      throw new Error(
        `Failed to read LavaMoat policy file at ${hrPath(policyPath)}`,
        {
          cause: err,
        }
      )
    }
  }
  try {
    assertPolicy(allegedPolicy)
    return allegedPolicy
  } catch (err) {
    throw new Error(
      `Invalid LavaMoat policy at ${hrPath(policyPath)}; does not match expected schema`,
      { cause: err }
    )
  }
}

/**
 * Reads a `policy-override.json` from disk, if any.
 *
 * @param {string | URL} policyOverridePath Path to policy override
 * @param {ReadPolicyOverrideOptions} [options] Options
 * @returns {Promise<LavaMoatPolicy | undefined>}
 */
export const maybeReadPolicyOverride = async (
  policyOverridePath,
  { readFile = nodeFs.promises.readFile } = {}
) => {
  /** @type {unknown} */
  let allegedPolicy
  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    allegedPolicy = await readJsonFile(policyOverridePath, { readFile })
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(
        `Invalid LavaMoat policy overrides at ${hrPath(policyOverridePath)}; failed to parse JSON`,
        { cause: err }
      )
    }
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      log.debug(
        `No LavaMoat policy overrides found at ${hrPath(policyOverridePath)}`
      )
      return
    }

    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw new Error(
        `Failed to read LavaMoat policy overrides file at ${hrPath(policyOverridePath)}`,
        {
          cause: err,
        }
      )
    }
  }

  try {
    assertPolicy(allegedPolicy)
    return allegedPolicy
  } catch (err) {
    throw new Error(
      `Invalid LavaMoat policy overrides at ${hrPath(policyOverridePath)}; does not match expected schema`,
      { cause: err }
    )
  }
}

/**
 * Reads a policy and policy override from object or disk and merges them into a
 * single policy.
 *
 * @privateRemarks
 * TODO: The way this fails is not user-friendly; it will just throw a
 * `TypeError` saying that the policy is invalid. **We should use proper schema
 * validation** to provide a more helpful error message.
 * @param {string | URL | LavaMoatPolicy} [policyOrPolicyPath] Path to
 *   `policy.json` or the policy itself. Defaults to
 *   `./lavamoat/node/policy.json` relative to
 *   {@link LoadPoliciesOptions.projectRoot}
 * @param {LoadPoliciesOptions} [options] Options
 * @returns {Promise<LavaMoatPolicy>}
 * @throws If a policy is invalid
 * @public
 */
export const loadPolicies = async (
  policyOrPolicyPath,
  {
    readFile = nodeFs.promises.readFile,
    projectRoot = process.cwd(),
    ...options
  } = {}
) => {
  policyOrPolicyPath ??= nodePath.resolve(
    projectRoot,
    constants.DEFAULT_POLICY_PATH
  )

  /** @type {LavaMoatPolicy | string | URL} */
  let policyOverrideOrPolicyOverridePath
  if (hasValue(options, 'policyOverride')) {
    policyOverrideOrPolicyOverridePath = options.policyOverride
  } else if (hasValue(options, 'policyOverridePath')) {
    policyOverrideOrPolicyOverridePath = options.policyOverridePath
  } else {
    // _if_ we have a policy path, we should compute the policy override path as its sibling.
    // if not, then we just have to guess.
    if (isString(policyOrPolicyPath) || policyOrPolicyPath instanceof URL) {
      const policyPath = toPath(policyOrPolicyPath)
      policyOverrideOrPolicyOverridePath = nodePath.join(
        nodePath.dirname(policyPath),
        constants.DEFAULT_POLICY_OVERRIDE_FILENAME
      )
    } else {
      policyOverrideOrPolicyOverridePath = nodePath.resolve(
        projectRoot,
        constants.DEFAULT_POLICY_OVERRIDE_PATH
      )
    }
  }

  /**
   * @type {[Promise<LavaMoatPolicy>, Promise<LavaMoatPolicy | undefined>]}
   */
  const promises = /** @type {any} */ ([])
  if (isPathLike(policyOrPolicyPath)) {
    promises.push(readPolicy(policyOrPolicyPath, { readFile }))
  } else {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicy(policyOrPolicyPath)
        return policyOrPolicyPath
      })
    )
  }
  if (isPathLike(policyOverrideOrPolicyOverridePath)) {
    promises.push(
      maybeReadPolicyOverride(policyOverrideOrPolicyOverridePath, {
        readFile,
      })
    )
  } else {
    promises.push(
      Promise.resolve().then(() => {
        try {
          assertPolicy(policyOverrideOrPolicyOverridePath)
          return policyOverrideOrPolicyOverridePath
        } catch (err) {
          throw new Error(
            `Invalid LavaMoat policy overrides; does not match expected schema`,
            { cause: err }
          )
        }
      })
    )
  }

  /**
   * This type is only here for documentation purposes and is not needed
   *
   * @type {[LavaMoatPolicy, LavaMoatPolicy | undefined]}
   */
  const policies = await Promise.all(promises)

  return mergePolicy(...policies)
}

/**
 * Assertion for a {@link LavaMoatPolicy} (or overrides)
 *
 * @param {unknown} value
 * @returns {asserts value is LavaMoatPolicy}
 */
export const assertPolicy = (value) => {
  if (!isPolicy(value)) {
    // TODO: need an object validator lib
    throw new TypeError('Invalid LavaMoat policy')
  }
}

/**
 * Writes a diff-friendly LavaMoat policy to file
 *
 * Creates the destination directory if it does not exist
 *
 * @param {string | URL} file Path to write to
 * @param {LavaMoatPolicy | LavaMoatPolicyDebug | LavaMoatPolicy} policy Any
 *   policy
 * @param {{ fs?: WritableFsInterface }} opts Options
 * @returns {Promise<void>}
 * @internal
 */
export const writePolicy = async (file, policy, { fs = nodeFs } = {}) => {
  const filepath = toPath(file)
  const policyDir = nodePath.dirname(filepath)
  /**
   * @type {string | undefined}
   */
  let createdDir
  try {
    // eslint-disable-next-line @jessie.js/safe-await-separator
    createdDir = await fs.promises.mkdir(policyDir, {
      recursive: true,
    })
  } catch (err) {
    throw new Error(`Failed to create policy directory ${hrPath(policyDir)}`, {
      cause: err,
    })
  }
  try {
    await fs.promises.writeFile(filepath, jsonStringifySortedPolicy(policy))
  } catch (err) {
    if (createdDir) {
      try {
        await fs.promises.rm(createdDir, { recursive: true })
      } catch (err) {
        const rmErr = new Error(
          `Failed to remove created directory ${hrPath(createdDir)}`,
          { cause: err }
        )
        throw new AggregateError([err, rmErr])
      }
    }
    throw err
  }
}

/**
 * Type predicate for a {@link LavaMoatPolicy}
 *
 * @remarks
 * This is non-exhaustive and should eventually be replaced with a proper
 * schema.
 * @param {unknown} value Value to check
 * @returns {value is LavaMoatPolicy} Whether the value is a `LavaMoatPolicy`
 * @public
 */
export const isPolicy = (value) => {
  return (
    isObjectyObject(value) &&
    hasValue(value, 'resources') &&
    isObjectyObject(value.resources) &&
    (!('root' in value) || isObjectyObject(value.root))
  )
}

/**
 * Returns `true` if there is no such
 * {@link RootPolicy.usePolicy `root.usePolicy`} field.
 *
 * @param {LavaMoatPolicy} policy
 * @returns {boolean}
 * @internal
 */
export const isTrusted = (policy) => {
  return !policy.root?.usePolicy
}
