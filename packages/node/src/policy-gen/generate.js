/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */
import assert from 'node:assert'
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { defaultReadPowers } from '../compartment/power.js'
import {
  DEFAULT_POLICY_DEBUG_FILENAME,
  DEFAULT_POLICY_OVERRIDE_FILENAME,
  DEFAULT_POLICY_PATH,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
} from '../constants.js'
import { log as defaultLog } from '../log.js'
import { readPolicyOverride, writePolicy } from '../policy-util.js'
import { devToConditions, hrPath, toPath } from '../util.js'
import { loadCompartmentMap } from './policy-gen-compartment-map.js'
import { compartmentMapToPolicy } from './to-policy.js'

/**
 * @import {GenerateOptions} from '../internal.js'
 * @import {GeneratePolicyOptions, CompartmentMapToPolicyOptions, IsAbsoluteFn} from '../types.js'
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug} from 'lavamoat-core'
 * @import {SetFieldType} from 'type-fest'
 */

/** @type {IsAbsoluteFn} */
const defaultIsAbsolute = nodePath.isAbsolute

/**
 * Returns `true` if a debug policy should be written
 *
 * Moonlights as a type guard for `policyDebugPath`
 *
 * @param {boolean} [shouldWrite] The "write" flag
 * @param {boolean} [debug] The "debug" flag
 * @param {string} [policyDebugPath] A path to the debug policy
 * @returns {policyDebugPath is string}
 */
const shouldWriteDebugPolicy = (shouldWrite, debug, policyDebugPath) =>
  !!(shouldWrite && debug && policyDebugPath)

/**
 * Generates a LavaMoat debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {SetFieldType<GenerateOptions, 'debug', true>} opts
 * @returns {Promise<LavaMoatPolicyDebug>}
 */

/**
 * Generates a LavaMoat policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {GenerateOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 */

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypoint
 * @param {GenerateOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 */
const generate = async (
  entrypoint,
  {
    readPowers = defaultReadPowers,
    debug = false,
    policyOverride,
    isBuiltin,
    log = defaultLog,
    dev = false,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    ...archiveOpts
  } = {}
) => {
  const conditions = devToConditions(dev)

  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    entrypoint,
    {
      ...archiveOpts,
      log,
      readPowers,
      conditions,
      policyOverride,
      trustRoot,
    }
  )

  /** @type {CompartmentMapToPolicyOptions} */
  const baseOpts = {
    readPowers,
    policyOverride,
    isBuiltin,
    log,
    trustRoot,
  }

  // this weird thing is to make TS happy about the overload
  const opts = debug ? { debug: true, ...baseOpts } : baseOpts

  return compartmentMapToPolicy(
    entrypoint,
    compartmentMap,
    sources,
    renames,
    opts
  )
}

/**
 * Absolute path to the default policy file
 */
const ABS_POLICY_PATH = nodePath.resolve(DEFAULT_POLICY_PATH)

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypoint
 * @param {GeneratePolicyOptions} [opts]
 * @returns {Promise<LavaMoatPolicy>}
 * @public
 */
export const generatePolicy = async (
  entrypoint,
  {
    policyDebugPath: rawPolicyDebugPath,
    policyPath: rawPolicyPath = ABS_POLICY_PATH,
    policyOverridePath: rawPolicyOverridePath,
    policyOverride,
    writableFs = nodeFs,
    readPowers = defaultReadPowers,
    isAbsolute = defaultIsAbsolute,
    write: shouldWrite = false,
    debug,
    readFile = nodeFs.promises.readFile,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    ...generateOpts
  } = {}
) => {
  await Promise.resolve()

  const entrypointPath = toPath(entrypoint)

  assert(
    isAbsolute(entrypointPath),
    `entrypoint must be an absolute path; got ${entrypointPath}`
  )

  const policyPath = toPath(rawPolicyPath)
  const policyDir = nodePath.dirname(policyPath)

  assert(
    isAbsolute(policyPath),
    `policyPath must be an absolute path; got ${policyPath}`
  )

  // the user may specify a policy override or a path to a policy override.
  // in this case, we handle the path.
  if (!policyOverride) {
    /** @type {string} */
    let policyOverridePath
    if (rawPolicyOverridePath) {
      policyOverridePath = toPath(rawPolicyOverridePath)
      assert(
        isAbsolute(policyOverridePath),
        `policyOverridePath must be an absolute path; got ${policyOverridePath}`
      )
    } else {
      policyOverridePath = nodePath.join(
        policyDir,
        DEFAULT_POLICY_OVERRIDE_FILENAME
      )
    }
    policyOverride = await readPolicyOverride(policyOverridePath, {
      readFile,
    })
  }

  /** @type {string | undefined} */
  let policyDebugPath

  if (shouldWrite && debug) {
    if (rawPolicyDebugPath) {
      policyDebugPath = toPath(rawPolicyDebugPath)
      assert(
        isAbsolute(policyDebugPath),
        `policyDebugPath must be an absolute path; got ${policyDebugPath}`
      )
    } else {
      policyDebugPath = nodePath.join(policyDir, DEFAULT_POLICY_DEBUG_FILENAME)
    }
  }

  /**
   * This value will be returned once populated
   *
   * @type {LavaMoatPolicy}
   */
  let policy

  const niceEntrypointPath = hrPath(entrypoint)

  /**
   * If the debug flag was true, then the result of generatePolicy will be a
   * `LavaMoatPolicyDebug`. we will write that entire thing to the debug policy,
   * then extract everything except the `debugInfo` prop, and write _that_ to
   * {@link policy}
   */
  if (shouldWriteDebugPolicy(shouldWrite, debug, policyDebugPath)) {
    log.info(`Generating "debug" LavaMoat policy from ${niceEntrypointPath}`)
    const debugPolicy = await generate(entrypoint, {
      ...generateOpts,
      readPowers,
      trustRoot,
      debug: true,
      policyOverride,
    })
    await writePolicy(policyDebugPath, debugPolicy, { fs: writableFs })
    const nicePolicyDebugPath = hrPath(policyDebugPath)
    log.info(`Wrote debug policy to ${nicePolicyDebugPath}`)
    // do not attempt to use the `delete` keyword with typescript. you have been
    // warned!
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { debugInfo: _, ...corePolicy } = /** @type {LavaMoatPolicyDebug} */ (
      debugPolicy
    )
    policy = corePolicy
  } else {
    log.info(`Generating LavaMoat policy from ${niceEntrypointPath}`)
    policy = await generate(entrypoint, {
      ...generateOpts,
      trustRoot,
      readPowers,
      policyOverride,
    })
  }

  if (shouldWrite) {
    await writePolicy(policyPath, policy, { fs: writableFs })
  }
  log.info(`Wrote policy to ${hrPath(policyPath)}`)
  return policy
}
