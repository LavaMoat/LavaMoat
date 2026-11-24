/**
 * Provides {@link loadPolicy}, {@link loadPolicyAndApplyOverrides}, and
 * {@link loadPoliciesSync} for reading LavaMoat policy files from disk.
 *
 * @packageDocumentation
 */

import { readFileSync } from 'node:fs'
import { mergePolicy } from './merge-policy.js'
import type { LavaMoatPolicy } from '@lavamoat/types'

/**
 * Options for policy file loading functions.
 */
export interface PolicyOpts {
  /** Enable verbose debug logging */
  debugMode: boolean
  /** Absolute path to the policy JSON file */
  policyPath: string
}

/**
 * Reads a policy file from disk synchronously.
 *
 * Returns `undefined` if the file does not exist (ENOENT). All other I/O
 * errors are re-thrown.
 *
 * @param opts - Policy load options
 * @returns Parsed policy object, or `undefined` if file not found
 * @internal
 */
function readPolicyFileSync({
  debugMode,
  policyPath,
}: PolicyOpts): LavaMoatPolicy | undefined {
  if (debugMode) {
    console.warn(`Lavamoat looking for policy at '${policyPath}'`)
  }
  let rawPolicy: string
  try {
    rawPolicy = readFileSync(policyPath, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    } else if (debugMode) {
      console.warn(`Lavamoat could not find policy at '${policyPath}'`)
    }
    return undefined
  }
  try {
    return JSON.parse(rawPolicy) as LavaMoatPolicy
  } catch (error) {
    if (debugMode) {
      console.warn({
        error:
          (error as { message?: string } | null)?.message ?? String(error),
        policyPath,
        rawPolicy,
      })
    }
    throw new Error(
      `Lavamoat could not parse policy at '${policyPath}': ${(error as NodeJS.ErrnoException).message}`
    )
  }
}

/**
 * Checks if all resources from an override exist in the generated policy.
 *
 * Used to detect when a new override was added after the last policy
 * generation, so callers can warn the user.
 *
 * @internal
 */
function wasOverrideIncluded(
  policy: LavaMoatPolicy,
  override: LavaMoatPolicy
): boolean {
  if (!override.resources) return true
  if (!policy.resources) return false
  return Object.keys(override.resources).every((key) =>
    Object.hasOwn(policy.resources, key)
  )
}

/**
 * Loads a policy from disk, returning a default empty policy if not found.
 *
 * @param opts - Policy load options
 * @returns Parsed policy, or `{ resources: {} }` if the file does not exist
 *
 * @todo There is currently no validation of the parsed JSON — the value could
 *   be anything `JSON.parse()` returns. Schema validation should be added.
 *
 * @example
 * ```ts
 * const policy = await loadPolicy({ debugMode: false, policyPath: './lavamoat/node/policy.json' })
 * ```
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function loadPolicy({
  debugMode,
  policyPath,
}: PolicyOpts): Promise<LavaMoatPolicy> {
  let policy: LavaMoatPolicy = { resources: {} }
  try {
    const rawPolicy = readPolicyFileSync({ debugMode, policyPath })
    policy = rawPolicy ?? policy
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err
    } else if (debugMode) {
      console.warn(`Lavamoat could not find policy at '${policyPath}'`)
    }
  }
  return policy
}

/**
 * Loads policy and policy overrides from disk and merges them.
 *
 * Warns (via `console.warn`) if the override contains resources not yet
 * present in the generated policy, indicating that policy generation should be
 * re-run.
 *
 * @param opts - Policy load options plus path to the override file
 * @returns Merged policy
 *
 * @example
 * ```ts
 * const policy = await loadPolicyAndApplyOverrides({
 *   debugMode: false,
 *   policyPath: './lavamoat/node/policy.json',
 *   policyOverridePath: './lavamoat/node/policy-override.json',
 * })
 * ```
 */
export async function loadPolicyAndApplyOverrides({
  debugMode,
  policyPath,
  policyOverridePath,
}: PolicyOpts & { policyOverridePath: string }): Promise<LavaMoatPolicy> {
  const policy = await loadPolicy({ debugMode, policyPath })

  const policyOverride = readPolicyFileSync({
    debugMode,
    policyPath: policyOverridePath,
  })

  if (!policyOverride) {
    return policy
  }

  if (debugMode) {
    console.warn('Merging policy-override.json into policy.json')
  }

  const finalPolicy = mergePolicy(policy, policyOverride)

  if (!wasOverrideIncluded(policy, policyOverride)) {
    console.warn(
      'LavaMoat: A new policy override was added since the policy was last generated. Please run policy generation again to make sure all is up to date.'
    )
  }

  return finalPolicy
}

/**
 * Result of {@link loadPoliciesSync}.
 */
export interface LoadPoliciesSyncResult {
  /** The raw generated policy (without override applied), or `undefined` if not found */
  policy: LavaMoatPolicy | undefined
  /**
   * Applies the override (if any was found on disk) to a given base policy and
   * returns the merged result
   */
  applyOverride: (main: LavaMoatPolicy) => LavaMoatPolicy
}

/**
 * Synchronously loads policy and policy overrides from disk.
 *
 * Returns the raw policy and an `applyOverride` function that merges the
 * override into any provided base policy. Does not write anything back to
 * disk.
 *
 * @param opts - Policy load options plus path to the override file
 * @returns Object with `policy` and `applyOverride`
 */
export function loadPoliciesSync({
  debugMode,
  policyPath,
  policyOverridePath,
}: PolicyOpts & { policyOverridePath: string }): LoadPoliciesSyncResult {
  const policy = readPolicyFileSync({ debugMode, policyPath })
  const policyOverride = readPolicyFileSync({
    debugMode,
    policyPath: policyOverridePath,
  })

  return {
    policy,
    applyOverride: (main: LavaMoatPolicy): LavaMoatPolicy => {
      if (!policyOverride) {
        return main
      }
      if (debugMode) {
        console.warn('Merging policy-override.json into policy.json')
      }
      return mergePolicy(main, policyOverride)
    },
  }
}
