/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */
import nodeFs from 'node:fs'
import nodePath from 'node:path'
import { defaultReadPowers } from '../compartment/power.js'
import {
  DEFAULT_POLICY_FILENAME,
  DEFAULT_TRUST_ROOT_COMPARTMENT,
} from '../constants.js'
import { hrLabel, hrPath } from '../format.js'
import { assertAbsolutePath } from '../fs.js'
import { log as defaultLog } from '../log.js'
import { maybeReadPolicyOverride, writePolicy } from '../policy-util.js'
import {
  makeDefaultPolicyDebugPath,
  makeDefaultPolicyOverridePath,
  toPath,
} from '../util.js'
import { loadCompartmentMapForPolicy } from './policy-gen-compartment-map.js'
import { compartmentMapToPolicy } from './to-policy.js'

const { keys, values } = Object

/**
 * @import {GenerateOptions, GenerateResult, ReportInvalidOverridesOptions,
 *   CompartmentMapToPolicyOptions} from '../internal.js'
 * @import {GeneratePolicyOptions, CompleteCompartmentDescriptorDataMap,
 *   CompartmentDescriptorData} from '../types.js'
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
 * @returns {Promise<GenerateResult<LavaMoatPolicyDebug>>}
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
    ...archiveOpts
  } = {}
) => {
  log.debug('Loading compartment map…')
  const { compartmentMap, sources, renames, dataMap } =
    await loadCompartmentMapForPolicy(entrypoint, {
      ...archiveOpts,
      log,
      dev,
      readPowers,
      policyOverride,
      trustRoot,
      projectRoot,
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

  const policy = compartmentMapToPolicy(
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
 * Reports policy override resources which weren't found on disk and are thus
 * not in the compartment map descriptor.
 *
 * @template {CompartmentMapDescriptor} T
 * @param {T} compartmentMap
 * @param {CompleteCompartmentDescriptorDataMap<T>} dataMap
 * @param {ReportInvalidOverridesOptions} options
 * @returns {void}
 */
const reportInvalidOverrides = (
  compartmentMap,
  dataMap,
  { policyOverride, policyOverridePath, log = defaultLog }
) => {
  if (!policyOverride) {
    return
  }

  const canonicalNames = new Set(
    values(compartmentMap.compartments).map(
      (compartmentDescriptor) =>
        /** @type {CompartmentDescriptorData} */ (
          dataMap.get(compartmentDescriptor.location)
        ).canonicalName
    )
  )

  // TODO: use `Set.prototype.difference` once widely available
  const invalidOverrides = keys(policyOverride.resources).filter(
    (key) => !canonicalNames.has(key)
  )

  if (invalidOverrides.length) {
    let msg = `The following resource(s) provided in policy overrides`
    msg += policyOverridePath ? ` (${hrPath(policyOverridePath)})` : ''
    msg += ` were not found and may be invalid:\n`
    msg += invalidOverrides
      .map((invalidOverride) => `  - ${hrLabel(invalidOverride)}`)
      .join('\n')
    log.warning(msg)
  }
}

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
    projectRoot = process.cwd(),
    ...generateOpts
  } = {}
) => {
  await Promise.resolve()

  const entrypointPath = toPath(entrypoint)
  const projectRootPath = toPath(projectRoot)
  const policyPath = toPath(
    rawPolicyPath ?? nodePath.join(projectRoot, DEFAULT_POLICY_FILENAME)
  )

  assertAbsolutePath(
    entrypointPath,
    `entrypoint must be an absolute path; got ${entrypointPath}`
  )

  assertAbsolutePath(
    projectRootPath,
    `projectRoot must be an absolute path; got ${projectRootPath}`
  )

  assertAbsolutePath(
    policyPath,
    `policyPath must be an absolute path; got ${policyPath}`
  )

  /** @type {string | undefined} */
  let policyOverridePath
  // the user may specify a policy override or a path to a policy override.
  // in this case, we handle the path.
  if (!policyOverride) {
    if (rawPolicyOverridePath) {
      policyOverridePath = toPath(rawPolicyOverridePath)
      assertAbsolutePath(
        policyOverridePath,
        `policyOverridePath must be an absolute path; got ${policyOverridePath}`
      )
    } else {
      policyOverridePath = makeDefaultPolicyOverridePath(policyPath)
    }
    policyOverride = await maybeReadPolicyOverride(policyOverridePath, {
      readFile,
    })
  }

  /** @type {string | undefined} */
  let policyDebugPath

  if (shouldWrite && debug) {
    if (rawPolicyDebugPath) {
      policyDebugPath = toPath(rawPolicyDebugPath)
      assertAbsolutePath(
        policyDebugPath,
        `policyDebugPath must be an absolute path; got ${policyDebugPath}`
      )
    } else {
      policyDebugPath = makeDefaultPolicyDebugPath(policyPath)
    }
  }

  /**
   * This value will be returned once populated
   *
   * @type {LavaMoatPolicy}
   */
  let policy
  /** @type {CompartmentMapDescriptor} */
  let compartmentMap
  /** @type {CompleteCompartmentDescriptorDataMap} */
  let dataMap

  const niceEntrypointPath = hrPath(entrypoint)

  /**
   * If the debug flag was true, then the result of generatePolicy will be a
   * `LavaMoatPolicyDebug`. we will write that entire thing to the debug policy,
   * then extract everything except the `debugInfo` prop, and write _that_ to
   * {@link policy}
   */
  if (shouldWriteDebugPolicy(policyDebugPath, { shouldWrite, debug })) {
    log.info(`Generating "debug" LavaMoat policy from ${niceEntrypointPath}`)
    /** @type {LavaMoatPolicyDebug} */
    let debugPolicy
    ;({
      policy: debugPolicy,
      compartmentMap,
      dataMap,
    } = await generate(entrypoint, {
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { debugInfo: _, ...corePolicy } = /** @type {LavaMoatPolicyDebug} */ (
      debugPolicy
    )
    policy = corePolicy
  } else {
    log.info(`Generating LavaMoat policy from ${niceEntrypointPath}…`)
    ;({ policy, compartmentMap, dataMap } = await generate(entrypoint, {
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
