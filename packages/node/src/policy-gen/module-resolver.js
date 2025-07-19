/**
 * Provides {@link makeModuleResolver} which returns a function that resolves
 * paths from `ModuleDescriptor` objects.
 *
 * @packageDocumentation
 */
import { defaultReadPowers } from '../compartment/power.js'
import { hrLabel } from '../format.js'
import { log as defaultLog } from '../log.js'
import { hasValue } from '../util.js'

/**
 * @import {CompartmentMapDescriptor, ModuleDescriptor} from '@endo/compartment-mapper'
 * @import {MakeModuleResolverOptions, ModuleResolver, ResolveCompartmentFn, ResolveModuleDescriptorFn} from '../internal.js'
 */

/**
 * @param {CompartmentMapDescriptor} compartmentMap Normalized compartment map
 * @param {Record<string, string>} compartmentLocationMap Mapping of compartment
 *   name (the key in `compartmentMap.compartments`; also used as the label) to
 *   compartment locations (`file://` URLs)
 * @param {MakeModuleResolverOptions} options
 * @returns {ModuleResolver}
 */
export const makeModuleResolver = (
  compartmentMap,
  compartmentLocationMap,
  { readPowers = defaultReadPowers, log = defaultLog } = {}
) => {
  const { compartments } = compartmentMap
  const { fileURLToPath } = readPowers

  /** @type {ResolveModuleDescriptorFn} */
  const resolveModuleDescriptor = (descriptor) => {
    // it might have a `compartment` and `module`
    if (hasValue(descriptor, 'compartment') && hasValue(descriptor, 'module')) {
      let { compartment: label } = descriptor
      const compartment = compartments[label]
      const compartmentLocation = compartmentLocationMap[descriptor.compartment]
      if (compartment && compartmentLocation) {
        let moduleDescriptor = compartment.modules[descriptor.module]
        if (moduleDescriptor) {
          /** @type {WeakSet<ModuleDescriptor>} */
          const seen = new WeakSet()
          // some of the module descriptors are redirects to others;
          // this resolves them until it finds one with a `location`
          // prop
          while (
            moduleDescriptor &&
            !moduleDescriptor.location &&
            hasValue(moduleDescriptor, 'compartment') &&
            hasValue(moduleDescriptor, 'module')
          ) {
            if (seen.has(moduleDescriptor)) {
              log.warning(
                `Cycle detected in module descriptors of compartment ${hrLabel(label)}`
              )
              return
            }
            seen.add(moduleDescriptor)
            /** @type {string} */
            let module
            ;({ compartment: label, module } = moduleDescriptor)
            moduleDescriptor = compartments[label]?.modules[module]
          }
          if (moduleDescriptor && hasValue(moduleDescriptor, 'location')) {
            return fileURLToPath(
              new URL(moduleDescriptor.location, compartmentLocation)
            )
          }
        }
      }
    }
    log.debug(
      `Cannot find path for ModuleDescriptor: ${JSON.stringify(descriptor)}`
    )
  }

  /**
   * @type {ResolveCompartmentFn}
   */
  const resolveCompartment = (label) => {
    if (hasValue(compartments, label)) {
      const compartmentLocation = compartmentLocationMap[label]
      if (compartmentLocation) {
        return fileURLToPath(new URL(compartmentLocation))
      }
      log.debug(
        `Cannot find compartment location for compartment ${hrLabel(label)}`
      )
    } else {
      log.debug(`Cannot find compartment ${hrLabel(label)}`)
    }
  }

  return { resolveModuleDescriptor, resolveCompartment }
}
