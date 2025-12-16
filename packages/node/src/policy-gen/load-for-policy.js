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
import {
  createModuleInspectionProgressReporter,
  reportInvalidCanonicalNames,
  reportSesViolations,
} from '../report.js'
import { pluralize } from '../util.js'
import { WorkerPool } from '../worker-pool.js'

/**
 * @import {LoadAndGeneratePolicyOptions,
 * LoadCompartmentMapResult,
 * InspectMessage,
 * InspectionResultsMessage,
 * ErrorMessage,
 * ModuleInspectionProgressReporter,
 * StructuredViolationsResult,
 * ReportModuleInspectionProgressFn} from '../internal.js'
 * @import {CanonicalName, ModuleSourceHookModuleSource} from '@endo/compartment-mapper'
 * @import {BuiltinPolicy, GlobalPolicy, GlobalPolicyValue, LavaMoatPolicy, PackagePolicy} from '@lavamoat/types'
 * @import {MergedLavaMoatPolicy, FileUrlString, SourceType} from '../types.js'
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
    rootUsePolicy,
  } = await makeNodeCompartmentMap(entrypointPath, {
    readPowers,
    dev,
    log,
    trustRoot,
    policyOverride,
  })

  /* c8 ignore next */
  if (!trustRoot && !rootUsePolicy) {
    // should never happen
    throw new GenerationError(
      `Root compartment is not trusted, but no data for root.usePolicy exists`
    )
  }

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
   * @type {WorkerPool<
   *   InspectMessage,
   *   InspectionResultsMessage | ErrorMessage
   * >}
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
  const packagePoliciesMap = new Map()

  /**
   * Stores SES compatibility violations for each package.
   *
   * Updated as we receive messages from the worker pool.
   *
   * @type {Map<CanonicalName, StructuredViolationsResult>}
   */
  const violationsForPackage = new Map()

  const { reportModuleInspectionProgress, reportModuleInspectionProgressEnd } =
    createModuleInspectionProgressReporter()

  const inspectModuleSource = createModuleSourceInspector(
    log,
    workerPool,
    inspectedModules,
    modulesToInspect,
    globalsForPackage,
    builtinsForPackage,
    violationsForPackage,
    pendingInspections,
    reportModuleInspectionProgress
  )

  // preprocess include array to match Endo's _preload format;
  // `compartment` is `name` in policy.
  const preload = policyOverride?.include?.map((include) =>
    typeof include === 'string'
      ? { compartment: include, entry: '.' }
      : { compartment: include.name, entry: include.entry }
  )

  try {
    await captureFromMap(readPowers, packageCompartmentMap, {
      ...DEFAULT_ENDO_OPTIONS,
      importHook: nullImportHook,
      log: log.debug.bind(log),
      _preload: preload,
      /**
       * Called for each package in the compartment map with a list of
       * connections (which are also canonical names).
       *
       * We use this to build the package policies.
       */
      packageConnectionsHook: ({
        canonicalName: rawCanonicalName,
        connections,
      }) => {
        if (!rootUsePolicy && rawCanonicalName === ROOT_COMPARTMENT) {
          return
        }
        const canonicalName =
          rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
            ? rootUsePolicy
            : rawCanonicalName
        const packagePolicy = packagePoliciesMap.get(canonicalName) ?? {}
        for (const connection of connections) {
          if (connection !== canonicalName) {
            packagePolicy[connection] = true
          }
        }
        // avoid empty package policies
        if (keys(packagePolicy).length > 0) {
          packagePoliciesMap.set(canonicalName, packagePolicy)
        }
      },
      /**
       * Called for each module source that Endo finds.
       *
       * We use this to inspect each module for globals, builtins, and SES
       * compatibility violations.
       */
      moduleSourceHook: ({ moduleSource, canonicalName: rawCanonicalName }) => {
        if (!rootUsePolicy && rawCanonicalName === ROOT_COMPARTMENT) {
          log.debug('Root module is trusted; skipping inspection')
          return
        }
        const canonicalName =
          rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
            ? rootUsePolicy
            : rawCanonicalName
        return inspectModuleSource(moduleSource, canonicalName)
      },
      ...options,
    })

    const inspectionResults = await Promise.allSettled([...pendingInspections])

    // Clear the progress line and move to next line
    if (process.stderr.isTTY) {
      reportModuleInspectionProgressEnd(inspectedModules, modulesToInspect)
    }

    const errors = inspectionResults
      .filter((result) => result.status !== 'fulfilled')
      .map((result) => result.reason)

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        `Failed to inspect ${errors.length}/${modulesToInspect.size} module(s): \n${errors.map((error) => `  ${error.message}`).join('\n')}`
      )
    }

    log.info(
      `${chalk.greenBright('✓')} ${chalk.bold('Completed inspection')} ${chalk.white('for')} ${chalk.whiteBright(modulesToInspect.size)} ${pluralize(modulesToInspect.size, 'module')}`
    )

    const policy = compilePolicy(
      globalsForPackage,
      builtinsForPackage,
      packagePoliciesMap,
      policyOverride,
      rootUsePolicy
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
 * Compiles the per-package policies and violations into a
 * {@link MergedLavaMoatPolicy}.
 *
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage Map of global
 *   policies for each package.
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage Map of builtin
 *   policies for each package.
 * @param {Map<CanonicalName, PackagePolicy>} packagesForPackage Map of package
 *   policies for each package.
 * @param {LavaMoatPolicy} [policyOverride] Policy override to merge with the
 *   compiled policy.
 * @param {CanonicalName | undefined} [rootUsePolicy] Canonical name of the
 *   untrusted entry package
 * @returns {MergedLavaMoatPolicy} Merged policy.
 */
const compilePolicy = (
  globalsForPackage,
  builtinsForPackage,
  packagesForPackage,
  policyOverride,
  rootUsePolicy
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

  if (rootUsePolicy) {
    policy.root = {
      usePolicy: rootUsePolicy,
    }
  }

  const mergedPolicy = mergePolicies(policy, policyOverride)

  return mergedPolicy
}

/**
 * Creates a module source inspector function with the provided dependencies.
 *
 * @param {Loggerr} log Logger instance.
 * @param {WorkerPool<
 *   InspectMessage,
 *   InspectionResultsMessage | ErrorMessage
 * >} workerPool
 *   Worker pool instance which expects to send only {@link InspectMessage}s and
 *   receive {@link InspectionResultsMessage}s or {@link ErrorMessage}s.
 * @param {Set<FileUrlString>} inspectedModules Set of modules that have been
 *   inspected already.
 * @param {Set<FileUrlString>} modulesToInspect For progress reporting
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage Map of global
 *   policies for each package.
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage Map of builtin
 *   policies for each package.
 * @param {Map<CanonicalName, StructuredViolationsResult>} violationsForPackage
 *   Map of SES compatibility violations for each package.
 * @param {Set<Promise<FileUrlString>>} pendingInspections Work queue of
 *   promises to inspect modules.
 * @param {ReportModuleInspectionProgressFn} reportModuleInspectionProgress
 *   Function to report module inspection progress.
 * @returns {(
 *   moduleSource: ModuleSourceHookModuleSource,
 *   canonicalName: CanonicalName,
 *   rootUsePolicy?: string
 * ) => void}
 *   Inspection function
 */
const createModuleSourceInspector = (
  log,
  workerPool,
  inspectedModules,
  modulesToInspect,
  globalsForPackage,
  builtinsForPackage,
  violationsForPackage,
  pendingInspections,
  reportModuleInspectionProgress
) => {
  /**
   * Sends task to inspect a module source to the worker pool and updates the
   * work queue ({@link pendingInspections}) and the set of modules to inspect
   * ({@link modulesToInspect}).
   *
   * Only supports JS sources.
   *
   * @param {ModuleSourceHookModuleSource} moduleSource Module source to
   *   inspect.
   * @param {CanonicalName} canonicalName Canonical name of the module.
   * @param {string | undefined} rootUsePolicy Canonical name of the policy to
   *   use for the root compartment.
   * @returns {void}
   */
  const inspectModuleSource = (moduleSource, canonicalName, rootUsePolicy) => {
    if ('error' in moduleSource || 'exit' in moduleSource) {
      return
    }
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

    /**
     * For progress reporting
     */
    let messageCount = 0

    log.debug(`Inspecting module: ${id}…`)
    const handleInspectionResults = createInspectionResultsHandler(
      canonicalName,
      globalsForPackage,
      builtinsForPackage,
      violationsForPackage,
      rootUsePolicy
    )

    // note that all rejections will be aggregated
    const inspectionPromise = workerPool
      .sendTask(message, MessageTypes.InspectionResults)
      .catch((error) => {
        log.error(`Error inspecting module ${id}: ${error.message}`)
        throw error
      })
      .then((message) => {
        switch (message.type) {
          case MessageTypes.InspectionResults: {
            inspectedModules.add(id)

            if (process.stderr.isTTY) {
              messageCount = reportModuleInspectionProgress(
                messageCount,
                inspectedModules,
                modulesToInspect
              )
            }

            handleInspectionResults(message)

            return id
          }

          // if an error is successfully trapped in the worker, we'll hit this.
          case MessageTypes.Error: {
            const { error } = message
            throw new GenerationError(
              `Error inspecting module ${id}: ${error}`,
              { cause: error }
            )
          }
        }
      })

    pendingInspections.add(inspectionPromise)
    modulesToInspect.add(id)
  }
  return inspectModuleSource
}

/**
 * Creates a function which handles a {@link InspectionResultsMessage} by
 * updating the appropriate maps.
 *
 * @param {CanonicalName} rawCanonicalName Canonical name of package per
 *   inspection
 * @param {Map<CanonicalName, GlobalPolicy>} globalsForPackage Map of global
 *   policies for each package.
 * @param {Map<CanonicalName, BuiltinPolicy>} builtinsForPackage Map of builtin
 *   policies for each package.
 * @param {Map<CanonicalName, StructuredViolationsResult>} violationsForPackage
 *   Map of SES compatibility violations for each package.
 * @param {CanonicalName | undefined} rootUsePolicy Canonical name of the policy
 *   to use for the root compartment.
 * @returns {(message: InspectionResultsMessage) => void} Function to handle
 *   inspection results.
 */
const createInspectionResultsHandler = (
  rawCanonicalName,
  globalsForPackage,
  builtinsForPackage,
  violationsForPackage,
  rootUsePolicy
) => {
  /**
   * If `rootUsePolicy` is provided, we're not trusting the entry package, so
   * we're going to generate a policy with `root.usePolicy` and create a
   * `ResourcePolicy` for the entry package by its name.
   */
  const canonicalName =
    rawCanonicalName === ROOT_COMPARTMENT && rootUsePolicy
      ? rootUsePolicy
      : rawCanonicalName

  /**
   * Builds data structures of per-package policies and violations.
   *
   * @param {InspectionResultsMessage} message
   */
  return ({ globalPolicy, builtinPolicy, violations }) => {
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
}
