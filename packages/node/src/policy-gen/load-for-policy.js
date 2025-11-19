/**
 * Provides {@link loadAndGeneratePolicy}, which returns a compartment map
 * descriptor for a given entrypoint.
 *
 * @packageDocumentation
 * @internal
 */

import { captureFromMap } from '@endo/compartment-mapper/capture-lite.js'
import chalk from 'chalk'
import { fileURLToPath } from 'node:url'
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
import { GenerationError } from '../error.js'
import { log as defaultLog } from '../log.js'
import { mergePolicies } from '../policy-util.js'
import { reportInvalidCanonicalNames, reportSesViolations } from '../report.js'
import { WorkerPool } from '../worker-pool.js'

/**
 * @import {LoadAndGeneratePolicyOptions, LoadCompartmentMapResult, InspectMessage, PoliciesMessage, ErrorMessage, SourceType, StructuredViolationsResult} from '../internal.js'
 * @import {CanonicalName, Language, LocalModuleSource} from '@endo/compartment-mapper'
 * @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue, LavaMoatPolicy, PackagePolicy} from '@lavamoat/types'
 * @import {MergedLavaMoatPolicy, FileUrlString} from '../types.js'
 * @import {Loggerr} from 'loggerr'
 */

const inspectorPath = fileURLToPath(new URL('./inspector.js', import.meta.url))

const { entries, keys } = Object

/**
 * The nitty-gritty of building a policy from a given entrypoint.
 *
 * Loads the compartment map and subscribes to hooks to inspect modules for
 * globals, builtins, and SES compatibility violations, then builds a policy
 * from it. This bypasses `lavamoat-core`'s inspector entirely.
 *
 * @param {string | URL} entrypointPath
 * @param {LoadAndGeneratePolicyOptions} options
 * @returns {Promise<LoadCompartmentMapResult>}
 * @internal
 */
export const loadAndGeneratePolicy = async (
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
  const {
    packageJsonMap,
    packageCompartmentMap,
    unknownCanonicalNames,
    knownCanonicalNames,
  } = await makeNodeCompartmentMap(entrypointPath, {
    readPowers,
    dev,
    log,
    trustRoot,
  })

  /**
   * In-flight requests to inspect modules
   *
   * @type {Set<Promise<FileUrlString>>}
   */
  const pendingInspections = new Set()

  /**
   * All modules to inspect. This will grow as our `moduleSource` hooks are
   * called.
   *
   * @type {Set<FileUrlString>}
   */
  const modulesToInspect = new Set()

  /**
   * List of modules that have been inspected. This will grow as our worker pool
   * messages are processed.
   *
   * @type {Set<FileUrlString>}
   */
  const inspectedModules = new Set()

  /**
   * A worker pool for inspecting modules.
   *
   * @type {WorkerPool<InspectMessage, PoliciesMessage | ErrorMessage>}
   */
  const workerPool = new WorkerPool(inspectorPath)

  /**
   * Stores global policies for each package.
   *
   * Updated as we receive messages from the worker pool.
   *
   * @type {Map<CanonicalName, GlobalPolicy>}
   */
  const globalsForPackage = new Map()

  /**
   * Stores builtin policies for each package.
   *
   * Updated as we receive messages from the worker pool.
   *
   * @type {Map<CanonicalName, BuiltinPolicy>}
   */
  const builtinsForPackage = new Map()

  /**
   * Stores package policies for each package.
   *
   * Updated as we receive messages from the worker pool.
   *
   * @type {Map<CanonicalName, PackagePolicy>}
   */
  const packagesForPackage = new Map()

  /**
   * Stores SES compatibility violations for each package.
   *
   * Updated as we receive messages from the worker pool.
   *
   * @type {Map<CanonicalName, StructuredViolationsResult>}
   */
  const violationsForPackage = new Map()

  // Create the module source inspector function with all dependencies
  const inspectModuleSource = createModuleSourceInspector(
    log,
    workerPool,
    inspectedModules,
    modulesToInspect,
    globalsForPackage,
    builtinsForPackage,
    violationsForPackage,
    pendingInspections
  )

  try {
    await captureFromMap(readPowers, packageCompartmentMap, {
      ...DEFAULT_ENDO_OPTIONS,
      importHook: nullImportHook,
      log: log.debug.bind(log),
      preload: policyOverride?.include,
      /**
       * Called for each package in the compartment map with a list of
       * connections (which are also canonical names).
       *
       * We use this to build the package policies.
       */
      packageConnectionsHook: ({ canonicalName, connections }) => {
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
      /**
       * Called for each module source that Endo finds.
       *
       * We use this to inspect each module for globals, builtins, and SES
       * compatibility violations.
       */
      moduleSourceHook: ({ moduleSource, canonicalName }) => {
        if (canonicalName === ROOT_COMPARTMENT) {
          return
        }
        if ('location' in moduleSource) {
          return inspectModuleSource(moduleSource, canonicalName)
        } else if ('error' in moduleSource) {
          throw new GenerationError(
            `Source loading error: ${moduleSource.error}`
          )
        }
      },
      ...options,
    })

    const inspectionResults = await Promise.allSettled([...pendingInspections])

    // Clear the progress line and move to next line
    if (process.stderr.isTTY) {
      const prefix = `        ${chalk.dim('›')} `
      process.stderr.write(
        `\r${prefix}${chalk.dim('▶')}${chalk.white('▶')}${chalk.whiteBright('▶')} ${chalk.white('Inspecting modules: ')}${chalk.whiteBright(inspectedModules.size)}${chalk.dim('/')}${chalk.white(modulesToInspect.size)} ${chalk.greenBright('✓')}\n`
      )
    }

    const errors = []
    for (const result of inspectionResults) {
      if (result.status !== 'fulfilled') {
        errors.push(result.reason)
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Failed to inspect ${errors.length}/${modulesToInspect.size} module(s): \n${errors.map((error) => `  ${error.message}`).join('\n')}`
      )
    }

    log.info(
      `${chalk.greenBright('✓')} ${chalk.bold('Completed inspection')} ${chalk.white('for')} ${chalk.whiteBright(modulesToInspect.size)} modules`
    )

    // TODO: handle untrusted root policy

    const policy = compilePolicy(
      globalsForPackage,
      builtinsForPackage,
      packagesForPackage,
      policyOverride
    )
    return { policy, packageJsonMap }
  } finally {
    if (policyOverride) {
      reportInvalidCanonicalNames(unknownCanonicalNames, knownCanonicalNames, {
        policy: policyOverride,
        log,
        what: 'policy overrides',
      })
    }

    // Report SES violations if any were found
    if (violationsForPackage.size > 0) {
      reportSesViolations(violationsForPackage, { log })
    }

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

/**
 * Creates a module source inspector function with the provided dependencies.
 *
 * @param {Loggerr} log
 * @param {WorkerPool<InspectMessage, PoliciesMessage | ErrorMessage>} workerPool
 * @param {Set<FileUrlString>} inspectedModules
 * @param {Set<FileUrlString>} modulesToInspect
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage
 * @param {Map<CanonicalName, StructuredViolationsResult>} violationsForPackage
 * @param {Set<Promise<FileUrlString>>} pendingInspections
 * @returns {(
 *   moduleSource: Omit<
 *     LocalModuleSource,
 *     'location' | 'sourceLocation' | 'sourceDirname' | 'parser' | 'record'
 *   > & { language: Language; location: FileUrlString },
 *   canonicalName: CanonicalName
 * ) => void}
 */
const createModuleSourceInspector = (
  log,
  workerPool,
  inspectedModules,
  modulesToInspect,
  globalsForPackage,
  builtinsForPackage,
  violationsForPackage,
  pendingInspections
) => {
  let messageCount = 0

  /**
   * @param {Omit<
   *   LocalModuleSource,
   *   'location' | 'sourceLocation' | 'sourceDirname' | 'parser' | 'record'
   * > & { language: Language; location: FileUrlString }} moduleSource
   * @param {CanonicalName} canonicalName
   * @returns {void}
   */
  const inspectModuleSource = (moduleSource, canonicalName) => {
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
        log.debug(
          `Unsupported language "${language}" for module ${id}; skipping`
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

    log.debug(`Inspecting module: ${id}`)

    const inspectionPromise = workerPool
      .sendTask(message, MessageTypes.Policies)
      .then((message) => {
        inspectedModules.add(id)
        if (process.stderr.isTTY) {
          messageCount++
          const trianglePos = ((messageCount - 1) % 3) + 1
          const prefix = '   '.split('')

          // Style the triangle based on position
          let styledTriangle
          if (trianglePos === 1) {
            styledTriangle = chalk.dim('▶')
          } else if (trianglePos === 2) {
            styledTriangle = chalk.white('▶')
          } else {
            styledTriangle = chalk.whiteBright('▶')
          }

          prefix[trianglePos - 1] = styledTriangle
          const prefixStr = prefix.join('')
          process.stderr.write(
            `\r        ${chalk.dim('›')} ${prefixStr} ${chalk.white('Inspecting modules: ')}${chalk.whiteBright(inspectedModules.size)}${chalk.dim('/')}${chalk.white(modulesToInspect.size)}`
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
            const currentBuiltinPolicy = builtinsForPackage.get(canonicalName)
            builtinsForPackage.set(canonicalName, {
              ...currentBuiltinPolicy,
              ...builtinPolicy,
            })
          }
          if (violations) {
            const currentViolations = violationsForPackage.get(canonicalName)
            if (currentViolations) {
              violationsForPackage.set(canonicalName, {
                primordialMutations: [
                  ...currentViolations.primordialMutations,
                  ...violations.primordialMutations,
                ],
                strictModeViolations: [
                  ...currentViolations.strictModeViolations,
                  ...violations.strictModeViolations,
                ],
                dynamicRequires: [
                  ...currentViolations.dynamicRequires,
                  ...violations.dynamicRequires,
                ],
              })
            } else {
              violationsForPackage.set(canonicalName, violations)
            }
          }
        }
        return id
      })
      .catch((error) => {
        log.error(`Error inspecting module ${id}: ${error.message}`)
        throw error
      })
    pendingInspections.add(inspectionPromise)
    modulesToInspect.add(id)
  }
  return inspectModuleSource
}
