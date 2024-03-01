/**
 * Provides Lavamoat policy generation facilities via {@link generatePolicy}
 *
 * @packageDocumentation
 */
import { loadCompartmentMapForArchive } from '@endo/compartment-mapper'
import assert from 'node:assert'
import nodeFs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { DEFAULT_POLICY_DEBUG_PATH, DEFAULT_POLICY_PATH } from '../constants.js'
import { importHook } from '../import-hook.js'
import { moduleTransforms } from '../module-transforms.js'
import { defaultReadPowers, makeReadPowers } from '../power.js'
import { writeJson } from '../util.js'
import { PolicyGenerator } from './policy-generator.js'

const { fromEntries, entries } = Object

/**
 * Generates a LavaMoat debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GenerateOptions & { debug: true }} opts
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicyDebug>}
 */
/**
 * Generates a LavaMoat policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @overload
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GenerateOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GenerateOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
async function generate(
  entrypointPath,
  { readPowers: powers, debug = false, policyOverride, ...archiveOpts } = {}
) {
  const readPowers = makeReadPowers(powers)

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
 * `@endo/compartment-mapper` and writes the result to disk
 *
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GeneratePolicyOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 * @public
 */
export async function generateAndWritePolicy(entrypointPath, opts = {}) {
  return generatePolicy(entrypointPath, { write: true, ...opts })
}

/**
 * Generates a LavaMoat policy or debug policy from a given entry point using
 * `@endo/compartment-mapper`
 *
 * @param {string | URL} entrypointPath
 * @param {import('./types.js').GeneratePolicyOptions} [opts]
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 * @public
 */
export async function generatePolicy(entrypointPath, opts = {}) {
  const {
    policyDebugPath = path.resolve(DEFAULT_POLICY_DEBUG_PATH),
    policyPath = path.resolve(DEFAULT_POLICY_PATH),
    fs = nodeFs,
    write: shouldWrite = false,
    ...generateOpts
  } = opts

  if (entrypointPath instanceof URL) {
    entrypointPath = fileURLToPath(entrypointPath)
  }
  assert(
    path.isAbsolute(entrypointPath),
    `entrypointPath must be an absolute path; got ${entrypointPath}`
  )
  if (shouldWrite) {
    assert(
      path.isAbsolute(policyPath),
      `policyPath must be an absolute path; got ${policyPath}`
    )
    if (policyDebugPath) {
      assert(
        path.isAbsolute(policyDebugPath),
        `policyDebugPath must be an absolute path; got ${policyDebugPath}`
      )
    }
  }

  await Promise.resolve()

  /** @type {import('lavamoat-core').LavaMoatPolicy} */
  let policy

  // if the debug flag was true, then the result of generatePolicy
  // will be a LavaMoatPolicyDebug.  we will write that entire thing to the debug policy,
  // then extract everything except the `debugInfo` prop, and write _that_ to the actual policy
  if (shouldWrite && generateOpts.debug) {
    const debugPolicy = await generate(entrypointPath, {
      ...generateOpts,
      debug: true,
    })
    await writeJson(policyDebugPath, debugPolicy, { fs })

    // do not attempt to use the `delete` keyword with typescript. you have been warned!

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { debugInfo, ...corePolicy } =
      /** @type {import('lavamoat-core').LavaMoatPolicyDebug} */ (debugPolicy)
    policy = corePolicy
  } else {
    policy = await generate(entrypointPath, generateOpts)
  }

  if (shouldWrite) {
    // XXX: do we need to merge policies here?
    await writeJson(policyPath, policy, { fs })
  }

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
    await loadCompartmentMapForArchive({
      dev: true,
      ...archiveOpts,
      readPowers,
      moduleLocation,
      importHook,
      moduleTransforms,
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
