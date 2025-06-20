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
import { LAVAMOAT_PKG_POLICY_ROOT } from './constants.js'
import { InvalidPolicyError, NoPolicyError } from './error.js'
import { hrPath } from './format.js'
import { readJsonFile } from './fs.js'
import { log } from './log.js'
import { hasValue, isObjectyObject, isPathLike, toPath } from './util.js'

/**
 * @import {CompartmentDescriptor} from '@endo/compartment-mapper'
 * @import {ModuleDescriptor} from 'ses'
 * @import {RootPolicy, LavaMoatPolicy} from 'lavamoat-core'
 * @import {CanonicalName, LavaMoatPolicyDebug, LoadPoliciesOptions, WritableFsInterface} from './types.js'
 * @import {ReadPolicyOptions, ReadPolicyOverrideOptions} from './internal.js'
 */

/**
 * Returns `true` if the compartment descriptor is the entry compartment
 *
 * By definition, this is a `CompartmentDescriptor` with an empty `path`.
 *
 * @param {CompartmentDescriptor} compartment
 * @returns {boolean}
 */
const isEntryCompartment = (compartment) => compartment.path?.length === 0

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
      throw new InvalidPolicyError(
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
      throw new InvalidPolicyError(
        `Failed to read LavaMoat policy overrides file at ${hrPath(policyOverridePath)}`,
        { cause: err }
      )
    }
  }

  try {
    assertPolicy(allegedPolicy)
    return allegedPolicy
  } catch (err) {
    throw new InvalidPolicyError(
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
  if (hasValue(options, 'policyOverridePath')) {
    policyOverridePath = toPath(options.policyOverridePath)
  } else if (hasValue(options, 'policyOverride')) {
    allegedPolicyOverride = options.policyOverride
  } else {
    // if the user specified a policy path, resolve as its sibling;
    // otherwise resolve from `projectRoot` since that's about all we can do.
    policyOverridePath = policyPath
      ? nodePath.join(
          nodePath.dirname(policyPath),
          constants.DEFAULT_POLICY_OVERRIDE_FILENAME
        )
      : nodePath.resolve(projectRoot, constants.DEFAULT_POLICY_OVERRIDE_PATH)
  }

  /**
   * An tuple of `Promise`s; each performs either a file read & a validation
   * _or_ just a validation.
   *
   * @privateRemarks
   * The fact that we either have a path _xor_ an alleged policy—combined with
   * the every-so-slightly different signatures of {@link readPolicy} and
   * {@link maybeReadPolicyOverride}—make these following conditionals painful to
   * abstract into a type-safe function. So I didn't.
   * @type {[
   *   policy: Promise<LavaMoatPolicy>,
   *   policyOverride: Promise<LavaMoatPolicy | undefined>,
   * ]}
   */
  const promises = /** @type {any} */ ([])
  if (policyPath) {
    promises.push(readPolicy(policyPath, { readFile }))
  } else {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicy(
          allegedPolicy,
          `Invalid LavaMoat policy; does not match expected schema`
        )

        return allegedPolicy
      })
    )
  }
  if (policyOverridePath) {
    promises.push(
      maybeReadPolicyOverride(policyOverridePath, {
        readFile,
      })
    )
  } else {
    promises.push(
      Promise.resolve().then(() => {
        assertPolicy(
          allegedPolicyOverride,
          `Invalid LavaMoat policy overrides; does not match expected schema`
        )
        return allegedPolicyOverride
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
 * Assertion for a {@link LavaMoatPolicy}
 *
 * @param {unknown} allegedPolicy
 * @param {string} [message] Assertion failure message
 * @returns {asserts allegedPolicy is LavaMoatPolicy}
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
    (!('root' in value) || isObjectyObject(value.root)) &&
    (!('hints' in value) || isObjectyObject(value.hints))
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

/**
 * Determine the canonical name for a compartment descriptor
 *
 * @param {CompartmentDescriptor} compartment Compartment descriptor
 * @param {boolean} [trustRoot=true] If `false`, never return a canonical name
 *   of {@link LAVAMOAT_PKG_POLICY_ROOT}. Default is `true`
 * @returns {CanonicalName} Canonical name
 * @throws {ReferenceError} If compartment has no path
 * @internal
 */
export const getCanonicalName = (
  compartment,
  trustRoot = constants.DEFAULT_TRUST_ROOT_COMPARTMENT
) => {
  // NOTE: the algorithm creating paths happens to be identical to the one in @lavamoat/aa package. Not that it matters because policies cannot be reused between this and other lavamoat tools.
  if (!compartment.path) {
    throw new ReferenceError(
      `Computing canonical name failed: compartment "${compartment.name}" (${compartment.location}) has no "path" property; this is a bug`
    )
  }
  if (isEntryCompartment(compartment)) {
    if (trustRoot) {
      return LAVAMOAT_PKG_POLICY_ROOT
    }
    return compartment.name
  }
  return compartment.path.join('>')
}
