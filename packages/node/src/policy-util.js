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
import {
  DEFAULT_POLICY_DIR,
  DEFAULT_POLICY_FILENAME,
  DEFAULT_POLICY_OVERRIDE_FILENAME,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
} from './constants.js'
import {
  InvalidPolicyError,
  NoPolicyError,
  TrustMismatchError,
  WritePolicyError,
} from './error.js'
import { hrCode, hrPath } from './format.js'
import { readJsonFile } from './fs.js'
import { log } from './log.js'
import {
  hasValue,
  isObjectyObject,
  isString,
  toAbsolutePath,
  toPath,
} from './util.js'

/**
 * @import {
 *   LavaMoatPolicy,
 *   RootPolicy
 * } from "@lavamoat/types"
 * @import {
 *   ReadPolicyOptions,
 *   ReadPolicyOverrideOptions
 * } from "./internal.js"
 * @import {
 *   Merged,
 *   WritableFsInterface
 * } from "./types.js"
 */

const { freeze } = Object

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
 * @param {{ fs?: WritableFsInterface; what?: 'policy' | 'policy override' }} opts
 *   Options
 * @returns {Promise<void>}
 * @public
 */
export const writePolicy = async (
  file,
  policy,
  { fs = nodeFs, what = 'policy' } = {}
) => {
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
      `Failed to create directory for ${what} at ${hrPath(policyDir)}`,
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
          `Failed to remove created directory ${hrPath(createdDir)}; may need manual cleanup`
        )
      }
    }
    throw new WritePolicyError(
      `Failed to write ${what} to ${hrPath(filepath)}`,
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
 * @returns {LavaMoatPolicy} Merged policy
 * @public
 */
export const mergePolicies = (policyA, policyB) => ({
  ...mergePolicy(policyA, policyB),
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
 * Asserts the value of `trustRoot` matches that returned by {@link isTrusted}
 * when run against `policy`
 *
 * @remarks
 * This only makes sense prior to execution.
 * @param {Merged} mergedPolicy LavaMoat policy
 * @param {string | URL} entrypoint Path to entry point (for error message)
 * @param {boolean} trustRoot Whether we plan to trust the root environment
 */
export const assertTrustRootMatchesPolicy = (
  mergedPolicy,
  entrypoint,
  trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT
) => {
  const policy = unwrapMerged(mergedPolicy)
  if (trustRoot && !isTrusted(policy)) {
    throw new TrustMismatchError(
      `Attempted to execute entrypoint ${hrPath(entrypoint)} as trusted, but policy expects an untrusted root. Either call ${hrCode('run()')} with option ${hrCode('{trustRoot: true}')} or provide a policy which trusts the root (without ${hrCode('root.usePolicy')}). Aborting`
    )
  } else if (!trustRoot && isTrusted(policy)) {
    throw new TrustMismatchError(
      `Attempted to execute entrypoint ${hrPath(entrypoint)} as untrusted, but policy expects a trusted root. Either call ${hrCode('run()')} with option ${hrCode('{trustRoot: false}')} or provide a policy which does not trust the root. Aborting`
    )
  }
}

/**
 * Extracts the `LavaMoatPolicy` from a {@link Merged} wrapper.
 *
 * @template {LavaMoatPolicy} [P=LavaMoatPolicy] The policy type. Default is
 *   `LavaMoatPolicy`
 * @param {Merged<P>} merged A merged policy wrapper
 * @returns {P}
 * @public
 */
export const unwrapMerged = (merged) => merged.policy

/**
 * Wraps a merged `LavaMoatPolicy` in the new {@link Merged} container.
 *
 * The wrapped form survives serialization (unlike the symbol-branded
 * `MergedLavaMoatPolicy`). Access the underlying policy via `.policy` or
 * {@link unwrapMerged}.
 *
 * @template {LavaMoatPolicy} [P=LavaMoatPolicy] The policy type. Default is
 *   `LavaMoatPolicy`
 * @param {P} policy A merged policy (typically produced by `mergePolicies`)
 * @returns {Merged<P>}
 * @public
 */

export const wrapMerged = (policy) => freeze({ policy, merged: true })

/**
 * Returns `true` if `value` is a {@link Merged} wrapper.
 *
 * @param {unknown} value
 * @returns {value is Merged}
 * @public
 */
export const isMergedWrapper = (value) =>
  isObjectyObject(value) &&
  'merged' in value &&
  value.merged === true &&
  'policy' in value &&
  isPolicy(value.policy)
