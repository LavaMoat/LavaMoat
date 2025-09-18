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
 * @import {CompartmentModuleDescriptorConfiguration, DigestedCompartmentMapDescriptor, ModuleDescriptorConfiguration, PackageCompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {MakeModuleResolverOptions, ModuleResolver, ResolveCompartmentFn, ResolveModuleDescriptorFn} from '../internal.js'
 */

/**
 * @param {DigestedCompartmentMapDescriptor} compartmentMap Normalized
 *   compartment map
 * @param {Record<string, string>} compartmentLocationMap Mapping of compartment
 *   name (the key in `compartmentMap.compartments`; also used as the label) to
 *   compartment locations (`file://` URLs)
 * @param {MakeModuleResolverOptions} options
 * @returns {ModuleResolver}
 */
export const makeModuleResolver = (
  compartmentMap,
  compartmentLocationMap,
  { log = defaultLog, readPowers = defaultReadPowers } = {}
) => {
  const { compartments } = compartmentMap
  const { fileURLToPath } = readPowers

  /** @type {Set<string>} */
  const warned = new Set()

  /** @type {ResolveModuleDescriptorFn} */
  const resolveModuleDescriptor = (descriptor) => {
    // it might have a `compartment` and `module`
    if ('compartment' in descriptor && 'module' in descriptor) {
      let { compartment: label } = descriptor
      const compartment = compartments[label]
      const compartmentLocation = compartmentLocationMap[descriptor.compartment]
      if (compartment && compartmentLocation) {
        let moduleDescriptor = compartment.modules[descriptor.module]
        if (moduleDescriptor) {
          if (moduleDescriptor.deferredError) {
            if (warned.has(moduleDescriptor.deferredError)) {
              return
            }
            warned.add(moduleDescriptor.deferredError)
            log.warning(moduleDescriptor.deferredError)
            return
          }

          /** @type {WeakSet<ModuleDescriptorConfiguration>} */
          const seen = new WeakSet()
          // some of the module descriptors are redirects to others;
          // this resolves them until it finds one with a `location`
          // prop
          while (
            moduleDescriptor &&
            'compartment' in moduleDescriptor &&
            'module' in moduleDescriptor
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

  return { resolveCompartment, resolveModuleDescriptor }
}
