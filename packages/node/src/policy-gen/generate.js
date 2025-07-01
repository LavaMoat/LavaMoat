/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */
import { defaultLog } from '@lavamoat/vog'
import nodeFs from 'node:fs'
import { defaultReadPowers } from '../compartment/power.js'
import { DEFAULT_TRUST_ROOT_COMPARTMENT } from '../constants.js'
import { hrCode, hrPath } from '../format.js'
import {
  makeDefaultPolicyDebugPath,
  makeDefaultPolicyOverridePath,
  makeDefaultPolicyPath,
  maybeReadPolicyOverride,
  writePolicy,
} from '../policy-util.js'
import { noop, toAbsolutePath } from '../util.js'
import { loadCompartmentMapForPolicy } from './policy-gen-compartment-map.js'
import { reportInvalidOverrides } from './report.js'
import { compartmentMapToPolicy } from './to-policy.js'

/**
 * @import {GenerateOptions, GenerateResult, CompartmentMapToPolicyOptions} from '../internal.js'
 * @import {GeneratePolicyOptions, CompleteCompartmentDescriptorDataMap, MergedLavaMoatPolicy, MergedLavaMoatPolicyDebug} from '../types.js'
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug} from 'lavamoat-core'
 * @import {SetFieldType} from 'type-fest'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 */

/**
 * Returns `true` if a debug policy should be written
 *
 * Moonlights as a type guard for `policyDebugPath`
 *
 * @param {string} [policyDebugPath] Path to debug policy file, if any
 * @param {Object} [options] Options
 * @param {boolean} [options.shouldWrite] The "write" flag
 * @param {boolean} [options.debug] The "debug" flag
 * @returns {policyDebugPath is string}
 */
const shouldWriteDebugPolicy = (
  policyDebugPath,
  { shouldWrite = false, debug = false } = {}
) => !!(shouldWrite && debug && policyDebugPath)

/**
 * Generates a LavaMoat debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {SetFieldType<GenerateOptions, 'debug', true>} opts
 * @returns {Promise<GenerateResult<MergedLavaMoatPolicyDebug>>}
 * @internal
 */

/**
 * Generates a LavaMoat policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {GenerateOptions} [opts]
 * @returns {Promise<GenerateResult>}
 * @internal
 */

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypoint
 * @param {GenerateOptions} [options] Options
 * @internal
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
    projectRoot = process.cwd(),
    decorators = [],
    onNodeModulesMapped = noop,
    ...archiveOpts
  } = {}
) => {
  const { compartmentMap, sources, renames, dataMap } =
    await loadCompartmentMapForPolicy(entrypoint, {
      ...archiveOpts,
      log,
      dev,
      readPowers,
      policyOverride,
      trustRoot,
      projectRoot,
      decorators,
      onNodeModulesMapped,
    })

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

  const policy = await compartmentMapToPolicy(
    entrypoint,
    compartmentMap,
    dataMap,
    sources,
    renames,
    opts
  )

  return { policy, compartmentMap, dataMap }
}

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypoint
 * @param {GeneratePolicyOptions} [opts]
 * @returns {Promise<MergedLavaMoatPolicy>}
 * @public
 */
export const generatePolicy = async (
  entrypoint,
  {
    policyDebugPath: rawPolicyDebugPath,
    policyPath: rawPolicyPath,
    policyOverridePath: rawPolicyOverridePath,
    policyOverride,
    writableFs = nodeFs,
    readPowers = defaultReadPowers,
    write: shouldWrite = false,
    debug,
    readFile = nodeFs.promises.readFile,
    log = defaultLog,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    projectRoot: rawProjectRootPath = process.cwd(),
    ...generateOpts
  } = {}
) => {
  await Promise.resolve()

  const entrypointPath = toAbsolutePath(
    entrypoint,
    `Entrypoint must be an absolute path; got ${hrCode(entrypoint)}`
  )
  const projectRoot = toAbsolutePath(
    rawProjectRootPath,
    `Project root must be an absolute path; got ${hrCode(rawProjectRootPath)}`
  )

  /** @type {string} */
  let policyPath
  if (rawPolicyPath) {
    policyPath = toAbsolutePath(
      rawPolicyPath,
      `Policy path must be an absolute path; got ${hrCode(rawPolicyPath)}`
    )
    log.debug(`User-provided policy path: ${policyPath}`)
  } else {
    policyPath = makeDefaultPolicyPath(projectRoot)
  }

  /** @type {string | undefined} */
  let policyOverridePath
  // the user may specify a policy override or a path to a policy override.
  // in this case, we handle the path.
  if (!policyOverride) {
    if (rawPolicyOverridePath) {
      policyOverridePath = toAbsolutePath(
        rawPolicyOverridePath,
        `Policy override path must be an absolute path; got ${hrCode(rawPolicyOverridePath)}`
      )
      log.debug(`User-provided policy override path: ${policyOverridePath}`)
    } else {
      policyOverridePath = makeDefaultPolicyOverridePath({
        policyPath,
        projectRoot,
      })
    }
    policyOverride = await maybeReadPolicyOverride(policyOverridePath, {
      readFile,
    })
  } else if (rawPolicyOverridePath) {
    log.warning(
      `Ignoring user-provided policy override path ${hrPath(rawPolicyOverridePath)} because a policy override object was provided`
    )
  }

  /** @type {string | undefined} */
  let policyDebugPath

  if (shouldWrite && debug) {
    if (rawPolicyDebugPath) {
      policyDebugPath = toAbsolutePath(
        rawPolicyDebugPath,
        `policyDebugPath must be an absolute path; got ${hrCode(rawPolicyDebugPath)}`
      )
    } else {
      policyDebugPath = makeDefaultPolicyDebugPath({ policyPath, projectRoot })
    }
  }

  /**
   * This value will be returned once populated
   *
   * @type {MergedLavaMoatPolicy}
   */
  let policy
  /** @type {CompartmentMapDescriptor} */
  let compartmentMap
  /** @type {CompleteCompartmentDescriptorDataMap} */
  let dataMap

  const niceEntrypointPath = hrPath(entrypointPath)

  /**
   * If the debug flag was true, then the result of generatePolicy will be a
   * `LavaMoatPolicyDebug`. we will write that entire thing to the debug policy,
   * then extract everything except the `debugInfo` prop, and write _that_ to
   * {@link policy}
   */
  if (shouldWriteDebugPolicy(policyDebugPath, { shouldWrite, debug })) {
    log.info(`Generating "debug" LavaMoat policy from ${niceEntrypointPath}`)
    /** @type {MergedLavaMoatPolicyDebug} */
    let debugPolicy
    ;({
      policy: debugPolicy,
      compartmentMap,
      dataMap,
    } = await generate(entrypointPath, {
      ...generateOpts,
      readPowers,
      trustRoot,
      debug: true,
      policyOverride,
      projectRoot,
    }))
    await writePolicy(policyDebugPath, debugPolicy, { fs: writableFs })
    const nicePolicyDebugPath = hrPath(policyDebugPath)
    log.info(`Wrote debug policy to ${nicePolicyDebugPath}`)
    // do not attempt to use the `delete` keyword with typescript. you have been
    // warned!
    const { debugInfo: _, ...corePolicy } = debugPolicy
    policy = corePolicy
  } else {
    log.info(`Generating LavaMoat policy from ${niceEntrypointPath}…`)
    ;({ policy, compartmentMap, dataMap } = await generate(entrypointPath, {
      ...generateOpts,
      trustRoot,
      readPowers,
      policyOverride,
      projectRoot,
    }))
  }

  // TODO: May want to also report invalid hints here instead of at time of processing
  reportInvalidOverrides(compartmentMap, dataMap, {
    log,
    policyOverride,
    policyOverridePath,
  })

  if (shouldWrite) {
    await writePolicy(policyPath, policy, { fs: writableFs })
    log.info(`Wrote policy to ${hrPath(policyPath)}`)
  }

  return policy
}
