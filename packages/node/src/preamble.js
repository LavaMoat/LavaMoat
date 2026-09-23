/**
 * The preamble must be loaded before any other code.
 *
 * {@link harden} must be called before execution.
 *
 * @packageDocumentation
 */

import 'ses'

import { endowmentsToolkit } from 'lavamoat-core'

/**
 * @import {LockdownOptions} from 'ses'
 * @import {
 *   CapabilityDefinition,
 *   HardenOptions
 * } from './internal.js'
 */

/**
 * @satisfies {LockdownOptions}
 */
const DEFAULT_LOCKDOWN_OPTIONS = /** @type {const} */ ({
  // lets code observe call stack, but easier debuggability
  errorTaming: 'unsafe',
  // shows the full call stack
  stackFiltering: 'verbose',
  // prevents most common override mistake cases from tripping up users
  overrideTaming: 'severe',
  // preserves JS locale methods, to avoid confusing users
  // prevents aliasing: toLocaleString() to toString(), etc
  localeTaming: 'unsafe',
})

/** @type {Map<string, CapabilityDefinition>} */
let capabilities

/**
 * Hardens the execution environment.
 *
 * Shoul only be called once per process. Subsequent calls will return the same
 * capabilities.
 *
 * @param {HardenOptions} [options]
 * @returns {{ capabilities: Map<string, CapabilityDefinition> }}
 */
export const harden = ({
  capabilitySources = [],
  globalRef = globalThis,
  lockdownOptions = DEFAULT_LOCKDOWN_OPTIONS,
  strict = false,
} = {}) => {
  if (capabilities && !strict) {
    return { capabilities }
  }

  repairIntrinsics(lockdownOptions)

  const { repairs, capabilities: caps } =
    endowmentsToolkit.evaluateCapabilities({
      sources: [...capabilitySources],
      globalRef,
    })

  capabilities = /** @type {Map<string, CapabilityDefinition>} */ (caps)

  for (const repair of repairs) {
    repair()
  }

  hardenIntrinsics()

  return {
    capabilities,
  }
}
