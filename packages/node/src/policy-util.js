/**
 * Utilities for reading and validating LavaMoat policies.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * TODO: Some of these functions accept a `{readPowers}` option, but others do
 * not. They should probably _all_ accept it for testing purposes.
 *
 * @packageDocumentation
 */

import { jsonStringifySortedPolicy, mergePolicy } from 'lavamoat-core'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import * as constants from './constants.js'
import {
  DEFAULT_POLICY_DIR,
  DEFAULT_POLICY_FILENAME,
  DEFAULT_POLICY_OVERRIDE_FILENAME,
} from './constants.js'
import { InvalidPolicyError, NoPolicyError, WritePolicyError } from './error.js'
import { hrCode, hrPath } from './format.js'
import { readJsonFile } from './fs.js'
import { log } from './log.js'
import {
  hasValue,
  isObjectyObject,
  isPathLike,
  isString,
  toAbsolutePath,
  toPath,
} from './util.js'

/**
 * @import {RootPolicy, LavaMoatPolicy} from '@lavamoat/types'
 * @import {MergedLavaMoatPolicy,
 *  LoadPoliciesOptions,
 *  WritableFsInterface} from './types.js'
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
    allegedPolicy = await readJsonFile(policyPath, { readFile })
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new InvalidPolicyError(
        `Invalid LavaMoat policy at ${hrPath(policyPath)}; failed to parse JSON`,
        { cause: err }
      )
    }
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      throw new NoPolicyError(
        `LavaMoat policy file not found at ${hrPath(policyPath)}`,
        { cause: err }
      )
    } else {
      throw new NoPolicyError(
        `Failed to read LavaMoat policy file at ${hrPath(policyPath)}`,
        {
          cause: err,
        }
      )
    }
  }
  try {
    assertPolicy(allegedPolicy)
    log.debug(`Read policy from ${hrPath(policyPath)}`)
    return allegedPolicy
  } catch (err) {
    throw new InvalidPolicyError(
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
 * @public
 */
export const maybeReadPolicyOverride = async (
  policyOverridePath,
  { readFile = nodeFs.promises.readFile } = {}
) => {
  /** @type {unknown} */
  let allegedPolicy
  try {
    allegedPolicy = await readJsonFile(policyOverridePath, { readFile })
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new InvalidPolicyError(
        `Invalid LavaMoat policy overrides at ${hrPath(policyOverridePath)}; failed to parse JSON`,
        { cause: err }
      )
    }
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') {
      log.debug(
        `No LavaMoat policy override file found at ${hrPath(policyOverridePath)}`
      )
      return
    }

    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'ENOENT') {
      throw new InvalidPolicyError(
        `Failed to read provided LavaMoat policy override file at ${hrPath(policyOverridePath)}`,
        { cause: err }
      )
    }
  }

  // TODO: integrate with @lavamoat/policy when it exists
  try {
    assertPolicy(allegedPolicy)
    log.debug(`Read policy override file from ${hrPath(policyOverridePath)}`)
    return allegedPolicy
  } catch (err) {
    throw new InvalidPolicyError(
      `Invalid LavaMoat policy override file at ${hrPath(policyOverridePath)}; does not match expected schema`,
      { cause: err }
    )
  }
}

/**
 * Reads a policy and policy override from object or disk and merges them into a
 * single policy.
 *
 * If `policyOrPolicyPath` is a `LavaMoatPolicy`, providing `options.policyPath`
 * is a hint for guessing the policy override path if neither
 * `options.policyOverride` nor `options.policyOverridePath` are provided.
 *
 * @privateRemarks
 * TODO: The way this fails is not user-friendly; it will just throw a
 * `InvalidPolicyError` saying that the policy is invalid. **We should use
 * proper schema validation** to provide a more helpful error message.
 * @param {string | URL | LavaMoatPolicy} [policyOrPolicyPath] Path to
 *   `policy.json` or the policy itself. Defaults to
 *   `./lavamoat/node/policy.json` relative to
 *   {@link LoadPoliciesOptions.projectRoot}
 * @param {LoadPoliciesOptions} [options] Options
 * @returns {Promise<MergedLavaMoatPolicy>}
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
  policyOrPolicyPath ??=
    options.policyPath ?? makeDefaultPolicyPath(projectRoot)

  /**
   * Path to policy
   *
   * `undefined` if {@link policyOrPolicyPath} is a policy. Mutually exclusive
   * with {@link allgedPolicy}
   *
   * @type {string | undefined}
   */
  let policyPath
  /**
   * Path to policy override
   *
   * `undefined` if {@link options.policyOverride} is a policy. Mutually
   * exclusive with {@link allegedPolicyOverride}
   *
   * @type {string | undefined}
   */
  let policyOverridePath

  /**
   * Policy prior to validation
   *
   * `undefined` if {@link policyOrPolicyPath} is a pathlike value. Truthy values
   * mutually exclusive with {@link policyPath}
   *
   * @type {unknown | undefined}
   */
  let allegedPolicy

  /**
   * Policy override prior to validation
   *
   * `undefined` if {@link options.policyOverridePath} is a pathlike value, or no
   * such file exists on disk. Truthy values mutually exclusive with
   * {@link policyOverridePath}
   *
   * @type {unknown | undefined}
   */
  let allegedPolicyOverride

  // either / or
  if (isPathLike(policyOrPolicyPath)) {
    policyPath = toPath(policyOrPolicyPath)
  } else {
    allegedPolicy = policyOrPolicyPath
  }

  // either / or / or nothing at all
  if (hasValue(options, 'policyOverride')) {
    allegedPolicyOverride = options.policyOverride
  } else if (hasValue(options, 'policyOverridePath')) {
    policyOverridePath = toPath(options.policyOverridePath)
  } else {
    let policyPathToUse = policyPath
    // use the hint if it's provided
    if (!policyPathToUse && hasValue(options, 'policyPath')) {
      policyPathToUse = toPath(options.policyPath)
    }
    // if the user specified a policy path, resolve as its sibling;
    // otherwise resolve from `projectRoot` since that's about all we can do.
    policyOverridePath = makeDefaultPolicyOverridePath({
      policyPath: policyPathToUse,
      projectRoot,
    })
  }

  /**
   * An tuple of `Promise`s; each performs either a file read & a validation
   * _or_ just a validation.
   *
   * @type {[
   *   policy: Promise<LavaMoatPolicy> | LavaMoatPolicy,
   *   policyOverride:
   *     | Promise<LavaMoatPolicy | undefined>
   *     | LavaMoatPolicy
   *     | undefined,
   * ]}
   */
  const jobs = /** @type {any} */ ([])
  if (policyPath) {
    jobs.push(readPolicy(policyPath, { readFile }))
  } else {
    jobs.push(
      (() => {
        assertPolicy(
          allegedPolicy,
          `Invalid LavaMoat policy; does not match expected schema`
        )

        return allegedPolicy
      })()
    )
  }
  if (policyOverridePath) {
    jobs.push(
      maybeReadPolicyOverride(policyOverridePath, {
        readFile,
      })
    )
  } else {
    jobs.push(
      (() => {
        assertPolicy(
          allegedPolicyOverride,
          `Invalid LavaMoat policy overrides; does not match expected schema`
        )
        return allegedPolicyOverride
      })()
    )
  }

  /**
   * This type is only here for documentation purposes and is not needed
   *
   * @type {[
   *   policy: LavaMoatPolicy,
   *   policyOverride: LavaMoatPolicy | undefined,
   * ]}
   */
  const policies = await Promise.all(jobs)

  return mergePolicies(...policies)
}

/**
 * Assertion for a {@link LavaMoatPolicy}
 *
 * @param {unknown} allegedPolicy
 * @param {string} [message] Assertion failure message
 * @returns {asserts allegedPolicy is LavaMoatPolicy}
 * @public
 */
export const assertPolicy = (
  allegedPolicy,
  message = 'Invalid LavaMoat policy; does not match expected schema'
) => {
  if (!isPolicy(allegedPolicy)) {
    throw new InvalidPolicyError(message)
  }
}

/**
 * Writes a diff-friendly LavaMoat policy to file
 *
 * Creates the destination directory if it does not exist
 *
 * @param {string | URL} file Path to write to
 * @param {LavaMoatPolicy} policy Any policy
 * @param {{ fs?: WritableFsInterface }} opts Options
 * @returns {Promise<void>}
 * @public
 */
export const writePolicy = async (file, policy, { fs = nodeFs } = {}) => {
  const filepath = toPath(file)
  const policyDir = nodePath.dirname(filepath)
  /**
   * @type {string | undefined}
   */
  let createdDir
  try {
    createdDir = await fs.promises.mkdir(policyDir, {
      recursive: true,
    })
  } catch (err) {
    throw new WritePolicyError(
      `Failed to create policy directory ${hrPath(policyDir)}`,
      {
        cause: err,
      }
    )
  }
  try {
    await fs.promises.writeFile(filepath, jsonStringifySortedPolicy(policy))
  } catch (err) {
    if (createdDir) {
      log.debug('Removing created policy directory due to write failure…')
      try {
        await fs.promises.rm(createdDir, { recursive: true })
      } catch {
        log.debug(
          `Failed to remove created policy directory ${hrPath(createdDir)}; may need manual cleanup`
        )
      }
    }
    throw new WritePolicyError(
      `Failed to write policy to ${hrPath(filepath)}`,
      {
        cause: err,
      }
    )
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
    (!('root' in value) || isObjectyObject(value.root)) &&
    (!('include' in value) ||
      (Array.isArray(value.include) &&
        value.include.every(
          (item) =>
            isString(item) ||
            (isObjectyObject(item) && 'name' in item && 'entry' in item)
        )))
  )
}

/**
 * Returns `true` if there is no such
 * {@link RootPolicy.usePolicy `root.usePolicy`} field.
 *
 * @param {LavaMoatPolicy} policy
 * @returns {boolean}
 * @public
 */
export const isTrusted = (policy) => {
  return !policy.root?.usePolicy
}

/**
 * Merges two LavaMoat policies into a single policy.
 *
 * Wraps {@link mergePolicy}.
 *
 * @param {LavaMoatPolicy} policyA A policy
 * @param {LavaMoatPolicy} [policyB] Usually an override policy
 * @returns {MergedLavaMoatPolicy} Merged policy
 * @public
 */
export const mergePolicies = (policyA, policyB) => ({
  ...mergePolicy(policyA, policyB),
  [constants.MERGED_POLICY_FIELD]: true,
})

/**
 * Computes a default path based on a policy path (or not) or a project root
 * path (or not).
 *
 * @remarks
 * Use of `hrCode` in the assertion failure messages is intentional, since
 * `hrPath` could conceivably convert a relative path to an absolute one.
 * @param {string} defaultDir Default directory to use
 * @param {string} defaultFilename Default filename to use
 * @param {Object} options
 * @param {string | URL} [options.policyPath] Path to the policy file
 * @param {string | URL} [options.projectRoot]
 * @returns {string}
 * @internal
 */
const makeDefaultPath = (
  defaultDir,
  defaultFilename,
  { policyPath, projectRoot }
) => {
  /** @type {string} */
  let dir
  if (policyPath) {
    policyPath = toAbsolutePath(
      policyPath,
      `Policy path must be an absolute path; got ${hrCode(policyPath)}`
    )
    dir = nodePath.dirname(policyPath)
    return nodePath.join(
      dir,
      `${nodePath.basename(policyPath, nodePath.extname(policyPath))}-override.json`
    )
  } else if (projectRoot) {
    projectRoot = toAbsolutePath(
      projectRoot,
      `Project root must be an absolute path; got ${hrCode(projectRoot)}`
    )
    dir = nodePath.join(projectRoot, defaultDir)
  } else {
    dir = nodePath.join(process.cwd(), defaultDir)
  }
  return nodePath.join(dir, defaultFilename)
}

/**
 * Given path to a policy file, returns the sibling path to the policy override
 * file
 *
 * @param {Object} options
 * @param {string | URL} [options.policyPath] Path to the policy file
 * @param {string | URL} [options.projectRoot]
 * @returns {string}
 * @internal
 */
export const makeDefaultPolicyOverridePath = ({ policyPath, projectRoot }) => {
  const path = makeDefaultPath(
    DEFAULT_POLICY_DIR,
    DEFAULT_POLICY_OVERRIDE_FILENAME,
    { policyPath, projectRoot }
  )
  log.debug(`Guessed policy override path: ${hrPath(path)}`)
  return path
}

/**
 * Computes a default path to the policy file, based on the project root
 * directory.
 *
 * @param {string | URL} [projectRoot=process.cwd()] Project root directory.
 *   Default is `process.cwd()`
 * @returns {string}
 * @internal
 */
export const makeDefaultPolicyPath = (projectRoot = process.cwd()) => {
  const path = makeDefaultPath(DEFAULT_POLICY_DIR, DEFAULT_POLICY_FILENAME, {
    projectRoot,
  })
  log.debug(`Using default policy path: ${hrPath(path)}`)
  return path
}

/**
 * Type guard for a merged LavaMoat policy.
 *
 * @param {unknown} policy
 * @returns {policy is MergedLavaMoatPolicy} Whether the policy is a merged
 *   LavaMoat policy
 */
export const isMergedPolicy = (policy) =>
  isPolicy(policy) &&
  constants.MERGED_POLICY_FIELD in policy &&
  policy[constants.MERGED_POLICY_FIELD] === true
