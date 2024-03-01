/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * @packageDocumentation
 */
import { loadCompartmentForArchive } from '@endo/compartment-mapper'
import assert from 'node:assert'
import nodeFs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_POLICY_DEBUG_PATH, DEFAULT_POLICY_PATH } from '../constants.js'
import { importHook } from '../import-hook.js'
import { moduleTransforms } from '../module-transforms.js'
import { defaultReadPowers, makeReadPowers } from '../power.js'
import { isFsAPI, writeJson } from '../util.js'
import { PolicyGenerator } from './policy-generator.js'

const { fromEntries, entries } = Object

/**
 * Generates a LavaMoat debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GeneratePolicyOptions & { debug: true }} opts
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicyDebug>}
 * @public
 */
/**
 * Generates a LavaMoat policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GeneratePolicyOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 * @public
 */

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GeneratePolicyOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 * @public
 */
export async function generatePolicy(
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    debug = false,
    policyOverride,
    ...archiveOpts
  } = {}
) {
  readPowers = isFsAPI(readPowers) ? makeReadPowers(readPowers) : readPowers

  const { compartmentMap, sources, renames } = await loadCompartmentMap(
    entrypointPath,
    {
      ...archiveOpts,
      readPowers,
    }
  )

  /** @type {import('./types.js').PolicyGeneratorOptions} */
  const baseOpts = { readPowers, policyOverride }

  // this weird thing is to make TS happy about the overload
  const opts = debug ? { debug: true, ...baseOpts } : baseOpts

  return await PolicyGenerator.generatePolicy(
    compartmentMap,
    sources,
    renames,
    opts
  )
}

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GenerateAndWritePolicyOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 * @public
 */
export async function generateAndWritePolicy(entrypointPath, opts = {}) {
  const {
    policyDebugPath = DEFAULT_POLICY_DEBUG_PATH,
    policyPath = DEFAULT_POLICY_PATH,
    fs = nodeFs,
    ...generateOpts
  } = opts

  assert(path.isAbsolute(policyPath), 'policyPath must be an absolute path')
  assert(
    path.isAbsolute(policyDebugPath),
    'policyDebugPath must be an absolute path'
  )

  await Promise.resolve()

  /** @type {import('lavamoat-core').LavaMoatPolicy | undefined} */
  let policy

  // if the debug flag was true, then the result of generatePolicy
  // will be a LavaMoatPolicyDebug.  we will write that entire thing to the debug policy,
  // then extract everything except the `debugInfo` prop, and write _that_ to the actual policy
  if (generateOpts.debug) {
    const debugPolicy = await generatePolicy(entrypointPath, {
      ...generateOpts,
      debug: true,
    })
    await writeJson(policyDebugPath, debugPolicy, { fs })

    // do not attempt to use the `delete` keyword with typescript. you have been warned!

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { debugInfo, ...corePolicy } =
      /** @type {import('lavamoat-core').LavaMoatPolicyDebug} */ (debugPolicy)
    policy = corePolicy
  }

  policy = policy ?? (await generatePolicy(entrypointPath, generateOpts))

  await writeJson(policyPath, policy, { fs })

  return policy
}

/**
 * Loads compartment map and associated sources.
 *
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').LoadCompartmentMapOptions} opts
 * @internal
 */
export async function loadCompartmentMap(
  entrypointPath,
  { readPowers = defaultReadPowers, ...archiveOpts } = {}
) {
  const moduleLocation =
    entrypointPath instanceof URL
      ? `${entrypointPath}`
      : `${pathToFileURL(entrypointPath)}`

  const { archiveCompartmentMap, archiveSources, compartmentRenames } =
    await loadCompartmentForArchive({
      dev: true,
      ...archiveOpts,
      readPowers,
      moduleLocation,
      importHook,
      moduleTransforms,
      extraParsers: {
        node: 'bytes',
      },
    })

  // `compartmentRenames` is a mapping of filepath to compartment name;
  // we need the reverse mapping.
  const renames = fromEntries(
    entries(compartmentRenames).map(([filepath, id]) => [id, filepath])
  )

  return {
    compartmentMap: archiveCompartmentMap,
    sources: archiveSources,
    renames,
  }
}
