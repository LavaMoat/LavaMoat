/**
 * Provides {@link loadCompartmentMapForPolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import { fileURLToPath } from 'node:url'
import difference from 'set.prototype.difference'
import isSubsetOf from 'set.prototype.issubsetof'
import { nullImportHook } from '../compartment/import-hook.js'
import { makeNodeCompartmentMap } from '../compartment/node-compartment-map.js'
import { DEFAULT_ENDO_OPTIONS } from '../compartment/options.js'
import { defaultReadPowers } from '../compartment/power.js'
import {
  DEFAULT_TRUST_ROOT_COMPARTMENT,
  LANGUAGE_CJS,
  LANGUAGE_MJS,
  MessageTypes,
  ROOT_COMPARTMENT,
  SOURCE_TYPE_MODULE,
  SOURCE_TYPE_SCRIPT,
} from '../constants.js'
import { log as defaultLog } from '../log.js'
import { mergePolicies } from '../policy-util.js'
import { WorkerPool } from '../worker-pool.js'

/**
 * @import {LoadCompartmentMapForPolicyOptions, LoadCompartmentMapResult} from '../internal.js'
 * @import {CanonicalName, CaptureFromMapHooks, FileUrlString, HookConfiguration} from '@endo/compartment-mapper'
 * @import {InspectMessage, PoliciesMessage, ErrorMessage, SourceType} from './inspector.js';
 * @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue, LavaMoatPolicy, PackagePolicy} from '@lavamoat/types'
 * @import {MergedLavaMoatPolicy} from '../types.js'
 */

const inspectorPath = fileURLToPath(new URL('./inspector.js', import.meta.url))

const { entries, keys } = Object

/**
 * Loads compartment map and associated sources.
 *
 * This is _only_ for policy gen.
 *
 * @param {string | URL} entrypointPath
 * @param {LoadCompartmentMapForPolicyOptions} options
 * @returns {Promise<LoadCompartmentMapResult>}
 * @internal
 */
export const loadCompartmentMapForPolicy = async (
  entrypointPath,
  {
    readPowers = defaultReadPowers,
    policyOverride,
    trustRoot = DEFAULT_TRUST_ROOT_COMPARTMENT,
    log = defaultLog,
    dev,
    ...options
  } = {}
) => {
  /** @type {Set<Promise<void>>} */
  const pendingInspections = new Set()

  await Promise.resolve()
  let { packageCompartmentMap, packageJsonMap } = await makeNodeCompartmentMap(
    entrypointPath,
    {
      readPowers,
      dev,
      log,
      trustRoot,
    }
  )

  /** @type {Set<FileUrlString>} */
  const modulesToInspect = new Set()
  /** @type {Set<FileUrlString>} */
  const inspectedModules = new Set()

  /**
   * @type {WorkerPool<InspectMessage, PoliciesMessage | ErrorMessage>}
   */
  const workerPool = new WorkerPool(inspectorPath)

  /** @type {Map<CanonicalName, GlobalPolicy>} */
  const globalsForPackage = new Map()

  /**
   * @type {Map<CanonicalName, BuiltinPolicy>}
   */
  const builtinsForPackage = new Map()

  /**
   * @type {Map<CanonicalName, PackagePolicy>}
   */
  const packagesForPackage = new Map()

  /**
   * @type {HookConfiguration<CaptureFromMapHooks>}
   */
  const captureFromMapHooks = {
    packageConnections: ({ canonicalName, connections }) => {
      // this should be a dupe of whatever the root compartment is
      if (canonicalName === ROOT_COMPARTMENT) {
        return
      }
      const packagePolicy = packagesForPackage.get(canonicalName) ?? {}
      for (const connection of connections) {
        if (connection !== canonicalName) {
          packagePolicy[connection] = true
        }
      }
      // avoid empty package policies
      if (keys(packagePolicy).length > 0) {
        packagesForPackage.set(canonicalName, packagePolicy)
      }
    },
    moduleSource: ({ moduleSource, canonicalName }) => {
      if ('location' in moduleSource) {
        const { bytes: source, location: id, language } = moduleSource
        const type = MessageTypes.Inspect
        /** @type {SourceType | undefined} */
        let sourceType
        switch (language) {
          case LANGUAGE_MJS:
            sourceType = SOURCE_TYPE_MODULE
            break
          case LANGUAGE_CJS:
            sourceType = SOURCE_TYPE_SCRIPT
            break
          default: {
            log.warning(
              `Unknown language "${language}" for module ${id}; skipping`
            )
            return
          }
        }

        /** @type {InspectMessage} */
        const message = {
          source,
          id,
          sourceType,
          type,
        }

        const inspectionPromise = workerPool
          .sendTask(message, MessageTypes.Policies)
          .then((message) => {
            inspectedModules.add(id)
            if (process.stderr.isTTY) {
              process.stderr.write(
                `\rInspecting modules: ${inspectedModules.size}/${modulesToInspect.size}`
              )
            }
            if (message.type === MessageTypes.Policies) {
              const { globalPolicy, builtinPolicy, violations } = message
              if (globalPolicy) {
                const currentGlobalPolicy = globalsForPackage.get(canonicalName)
                globalsForPackage.set(canonicalName, {
                  ...currentGlobalPolicy,
                  ...globalPolicy,
                })
              }
              if (builtinPolicy) {
                const currentBuiltinPolicy =
                  builtinsForPackage.get(canonicalName)
                builtinsForPackage.set(canonicalName, {
                  ...currentBuiltinPolicy,
                  ...builtinPolicy,
                })
              }
              if (violations) {
                // TODO: handle violations
              }
            }
          })
        pendingInspections.add(inspectionPromise)
        modulesToInspect.add(id)
      } else if ('error' in moduleSource) {
        log.error(`Source loading error: ${moduleSource.error}`)
        // throw ?
      } else if ('exit' in moduleSource) {
        log.debug(`Skipping exit module: ${moduleSource.exit}`)
      }
    },
  }

  // listen for messages from the pool here; listeners should be no-ops for now
  try {
    await captureFromMap(readPowers, packageCompartmentMap, {
      ...DEFAULT_ENDO_OPTIONS,
      importHook: nullImportHook,
      log: log.debug.bind(log),
      forceLoad: policyOverride?.include,
      hooks: captureFromMapHooks,
      ...options,
    })

    const inspectionResults = await Promise.allSettled([...pendingInspections])

    // Clear the progress line and move to next line
    process.stdout.write('\n')

    let successCount = 0
    for (const result of inspectionResults) {
      if (result.status === 'fulfilled') {
        successCount++
      } else {
        log.error(`Global inspection failed: ${result.reason}`)
      }
    }

    log.info(
      `Completed global inspection for ${successCount}/${modulesToInspect.size} modules`
    )

    // TODO : handle error case
    // TODO: handle untrusted root policy
    if (
      modulesToInspect.size === inspectedModules.size &&
      isSubsetOf(inspectedModules, modulesToInspect)
    ) {
      const policy = compilePolicy(
        globalsForPackage,
        builtinsForPackage,
        packagesForPackage,
        policyOverride
      )
      return { policy, packageJsonMap }
    }
    throw new Error(
      `Failed to inspect all modules; missing ${difference(modulesToInspect, inspectedModules)}`
    )
  } finally {
    // Clean up the worker pool
    workerPool.terminate()
  }
}

/**
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage
 * @param {Map<CanonicalName, PackagePolicy>} packagesForPackage
 * @param {LavaMoatPolicy} [policyOverride]
 * @returns {MergedLavaMoatPolicy}
 */
const compilePolicy = (
  globalsForPackage,
  builtinsForPackage,
  packagesForPackage,
  policyOverride
) => {
  /** @type {LavaMoatPolicy} */
  const policy = { resources: {} }
  for (const [canonicalName, globalPolicy] of globalsForPackage) {
    // convert from Map into plain object
    /** @type {GlobalPolicy} */
    const plainGlobalPolicy = {}
    for (const [
      key,
      value,
    ] of /** @type {[name: string, value: GlobalPolicyValue][]} */ (
      entries(globalPolicy)
    )) {
      plainGlobalPolicy[key] = value
    }
    policy.resources[canonicalName] = {
      ...policy.resources[canonicalName],
      globals: plainGlobalPolicy,
    }
  }

  for (const [canonicalName, builtinPolicy] of builtinsForPackage) {
    policy.resources[canonicalName] = {
      ...policy.resources[canonicalName],
      builtin: builtinPolicy,
    }
  }

  for (const [canonicalName, packagePolicy] of packagesForPackage) {
    policy.resources[canonicalName] = {
      ...policy.resources[canonicalName],
      packages: packagePolicy,
    }
  }

  const mergedPolicy = mergePolicies(policy, policyOverride)

  return mergedPolicy
}
