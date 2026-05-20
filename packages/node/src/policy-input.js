/**
 * Normalized policy input abstraction for `@lavamoat/node`.
 *
 * Provides discriminated-union types (`PolicySource`, `PolicyOverrideSource`,
 * `PolicyInput`) and helper factories for constructing them, replacing the
 * polymorphic / XOR-shaped option patterns in the legacy API.
 *
 * Also provides the canonical policy-loading entry points (`loadFromInput`,
 * `loadPolicy`) and the `Merged<T>` wrapper utilities.
 *
 * **All public exports of this module are re-exported from the package root.**
 *
 * @packageDocumentation
 */

import nodeFs from 'node:fs'
import { InvalidArgumentsError } from './error.js'
import { hrPath } from './format.js'
import {
  assertPolicy,
  makeDefaultPolicyOverridePath,
  makeDefaultPolicyPath,
  maybeReadPolicyOverride,
  mergePolicies,
  readPolicy,
  wrapMerged,
} from './policy-util.js'
import { toPath } from './util.js'

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {ResolvedPolicySources} from './internal.js'
 * @import {
 *   Merged,
 *   PolicyInput,
 *   PolicyInputOptions,
 *   PolicyOverrideSource,
 *   PolicySource,
 *   WithReadFile
 * } from './types.js'
 */

const { freeze } = Object

// #region helpers
/**
 * Constructs a `PolicySource` that reads a policy from the given file path.
 *
 * @param {string | URL} path Path or URL to the policy file
 * @returns {PolicySource}
 * @throws {InvalidArgumentsError} If `path` resolves to an empty string
 * @public
 */
export const policySourceFromFile = (path) => {
  const normalized = toPath(path)
  if (!normalized) {
    throw new InvalidArgumentsError(
      `Policy file path must be non-empty; got ${hrPath(path)}`
    )
  }
  return freeze({
    kind: 'file',
    path: normalized,
  })
}

/**
 * Constructs a `PolicySource` for an inline policy object.
 *
 * Validates the policy against the LavaMoat schema at construction time.
 *
 * @param {LavaMoatPolicy} policy A policy object
 * @returns {PolicySource}
 * @throws {InvalidPolicyError} If `policy` does not match the expected schema
 * @public
 */
export const policySourceFromInline = (policy) => {
  assertPolicy(policy)
  return freeze({
    kind: 'inline',
    policy,
  })
}

/**
 * Constructs a `PolicySource` that loads from the default policy location
 * (`<projectRoot>/lavamoat/node/policy.json`).
 *
 * @param {string | URL} [projectRoot]
 * @returns {PolicySource}
 * @public
 */
export const policySourceFromDefault = (projectRoot = process.cwd()) =>
  freeze({
    kind: 'default',
    projectRoot: toPath(projectRoot),
  })

/**
 * Constructs a `PolicyOverrideSource` that reads an override from the given
 * file path.
 *
 * Unlike the primary policy, a missing override file is **not** an error — if
 * the file does not exist the override is silently skipped.
 *
 * @param {string | URL} path Path or URL to the policy override file
 * @returns {PolicyOverrideSource}
 * @throws {InvalidArgumentsError} If `path` resolves to an empty string
 * @public
 */
export const policyOverrideSourceFromFile = (path) => {
  const normalized = toPath(path)
  if (!normalized) {
    throw new InvalidArgumentsError(
      `Policy override file path must be non-empty; got ${hrPath(path)}`
    )
  }
  return freeze({
    kind: 'file',
    path: normalized,
  })
}

/**
 * Constructs a `PolicyOverrideSource` for an inline policy override object.
 *
 * Validates the override against the LavaMoat schema at construction time.
 *
 * @param {LavaMoatPolicy} policy A policy override object
 * @returns {PolicyOverrideSource}
 * @throws {InvalidPolicyError} If `policy` does not match the expected schema
 * @public
 */
export const policyOverrideSourceFromInline = (policy) => {
  assertPolicy(
    policy,
    'Invalid LavaMoat policy overrides; does not match expected schema'
  )
  return freeze({
    kind: 'inline',
    policy,
  })
}

/**
 * Constructs a `PolicyOverrideSource` that auto-detects the override path.
 *
 * At load time the path is computed as:
 *
 * - A sibling of the primary policy file when the primary comes from a file,
 * - Otherwise `<projectRoot>/lavamoat/node/policy-override.json`.
 *
 * If no file is found at the computed path, the override is silently skipped.
 *
 * @param {string | URL} [projectRoot]
 * @returns {PolicyOverrideSource}
 * @public
 */
export const policyOverrideAuto = (projectRoot = process.cwd()) =>
  freeze({
    kind: 'auto',
    projectRoot: toPath(projectRoot),
  })

/**
 * Constructs a `PolicyOverrideSource` representing the absence of a policy
 * override. No override file is read and no override is merged.
 *
 * @returns {PolicyOverrideSource}
 * @public
 */
export const policyOverrideNone = () =>
  freeze({
    kind: 'none',
  })
// #endregion

/**
 * Constructs a {@link PolicyInput} from explicit source descriptors.
 *
 * Defaults:
 *
 * - `primary` → `policySourceFromDefault({ projectRoot })`
 * - `override` → `policyOverrideAuto({ projectRoot })`
 *
 * @param {PolicyInputOptions} [opts]
 * @returns {PolicyInput}
 * @public
 */
export const policyInput = ({
  policy,
  override,
  projectRoot = process.cwd(),
} = {}) =>
  freeze({
    policy: policy ?? policySourceFromDefault(projectRoot),
    override: override ?? policyOverrideAuto(projectRoot),
  })

// ---------------------------------------------------------------------------
// Internal: resolve sources to concrete paths/values
// ---------------------------------------------------------------------------

/**
 * Resolves a {@link PolicyInput} into concrete paths and/or inline values.
 *
 * All default-path logic lives here — the only place where
 * `makeDefaultPolicyPath` and `makeDefaultPolicyOverridePath` are called.
 *
 * @param {PolicyInput} input
 * @returns {ResolvedPolicySources}
 * @internal
 */
export const resolvePolicySources = (input) => {
  /** @type {string | undefined} */
  let policyPath
  /** @type {LavaMoatPolicy | undefined} */
  let policy

  switch (input.policy.kind) {
    case 'default':
      policyPath = makeDefaultPolicyPath(input.policy.projectRoot)
      break
    case 'file':
      policyPath = input.policy.path
      break
    case 'inline':
      policy = input.policy.policy
      break
    default:
      throw new InvalidArgumentsError(
        `Unknown PolicySource kind: ${/** @type {any} */ (input.policy).kind}`
      )
  }

  /** @type {string | undefined} */
  let overridePath
  /** @type {LavaMoatPolicy | undefined} */
  let overridePolicy

  switch (input.override.kind) {
    case 'auto':
      // When the primary has a known path, use it for the sibling calculation;
      // otherwise fall back to projectRoot-based default.
      overridePath = makeDefaultPolicyOverridePath({
        policyPath: policyPath,
        projectRoot: input.override.projectRoot,
      })
      break
    case 'file':
      overridePath = input.override.path
      break
    case 'inline':
      overridePolicy = input.override.policy
      break
    case 'none':
      // No override — both overridePath and overridePolicy stay undefined.
      break
    default:
      throw new InvalidArgumentsError(
        `Unknown PolicyOverrideSource kind: ${/** @type {any} */ (input.override).kind}`
      )
  }

  return /** @type {ResolvedPolicySources} */ ({
    policyPath,
    policy,
    overridePath,
    overridePolicy,
  })
}

/**
 * Reads, validates, and merges a policy and its optional override, returning a
 * {@link Merged} wrapper.
 *
 * This is the canonical implementation that all policy-loading code paths route
 * through.
 *
 * @param {PolicyInput} input Structured policy input
 * @param {WithReadFile} [opts]
 * @returns {Promise<Merged>}
 * @public
 */
export const loadPolicy = async (
  input,
  { readFile = nodeFs.promises.readFile } = {}
) => {
  const resolved = resolvePolicySources(input)

  /** @type {LavaMoatPolicy} */
  let policy
  if (resolved.policyPath !== undefined) {
    policy = await readPolicy(resolved.policyPath, { readFile })
  } else {
    // resolved.policy was validated at factory time by
    // policySourceFromInline, but a caller may have constructed PolicyInput
    // directly, so re-validate defensively here.
    assertPolicy(resolved.policy)
    policy = resolved.policy
  }

  /** @type {LavaMoatPolicy | undefined} */
  let override
  if (resolved.overridePath !== undefined) {
    override = await maybeReadPolicyOverride(resolved.overridePath, {
      readFile,
    })
  } else if (resolved.overridePolicy !== undefined) {
    assertPolicy(
      resolved.overridePolicy,
      'Invalid LavaMoat policy overrides; does not match expected schema'
    )
    override = resolved.overridePolicy
  }

  const merged = mergePolicies(policy, override)
  return wrapMerged(merged)
}
