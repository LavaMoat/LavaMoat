/**
 * @import {CompartmentOptions, ImportHook, ModuleDescriptor, RecordModuleDescriptor, SourceModuleDescriptor, ModuleSource} from 'ses'
 * @import {Merge} from 'type-fest'
 * @import {CompartmentMapDescriptor} from '@endo/compartment-mapper'
 * @import {LavaMoatPolicyOverrides} from 'lavamoat-core'
 */

import { ATTENUATORS_COMPARTMENT } from '../constants.js'

const { entries } = Object

/**
 * Type guard for a {@link RecordModuleDescriptor} containing a
 * {@link ModuleSource}
 *
 * @param {ModuleDescriptor} moduleDescriptor
 * @returns {moduleDescriptor is Merge<RecordModuleDescriptor, {record: ModuleSource}>}
 */
const isRecordModuleDescriptor = (moduleDescriptor) =>
  typeof moduleDescriptor === 'object' &&
  'record' in moduleDescriptor &&
  moduleDescriptor.record

/**
 * Type guard for a {@link SourceModuleDescriptor} containing a
 * {@link ModuleSource}
 *
 * @param {ModuleDescriptor} moduleDescriptor
 * @returns {moduleDescriptor is Merge<SourceModuleDescriptor, {source: ModuleSource}>}
 */
const isSourceModuleDescriptor = (moduleDescriptor) =>
  typeof moduleDescriptor === 'object' &&
  'source' in moduleDescriptor &&
  typeof moduleDescriptor.source === 'object' &&
  moduleDescriptor.source

/**
 * @param {CompartmentMapDescriptor} compartmentMap
 * @param {LavaMoatPolicyOverrides} [policyOverride]
 * @returns {typeof Compartment}
 */
export const makeGreedyCompartment = (compartmentMap, policyOverride) => {
  if (!policyOverride) {
    return Compartment
  }
  return class GreedyCompartment extends Compartment {
    /**
     * @param {CompartmentOptions} [options]
     */
    constructor(options = {}) {
      const { importHook, name } = options

      const wrapper =
        importHook && name && name !== ATTENUATORS_COMPARTMENT
          ? /** @type {ImportHook} */
            async (specifier) => {
              const moduleDescriptor = await importHook(specifier)

              if (name in compartmentMap.compartments) {
                const compartmentDescriptor = compartmentMap.compartments[name]

                for (const [
                  moduleDescriptorName,
                  { compartment: moduleDescriptorCompartmentName },
                ] of entries(compartmentDescriptor.modules)) {
                  // ignore self
                  if (
                    moduleDescriptorCompartmentName &&
                    compartmentMap.compartments[
                      moduleDescriptorCompartmentName
                    ] !== compartmentDescriptor
                  ) {
                    const modCompartmentDescriptor =
                      compartmentMap.compartments[
                        moduleDescriptorCompartmentName
                      ]
                    if (modCompartmentDescriptor) {
                      const canonicalName =
                        modCompartmentDescriptor.path?.join('>')
                      if (
                        canonicalName &&
                        canonicalName in (policyOverride?.resources ?? {}) &&
                        compartmentDescriptor.compartments.has(
                          moduleDescriptorCompartmentName
                        )
                      ) {
                        // this supports the "deprecated" RecordModuleDescriptor format and the new SourceModuleDescriptor format. we are futurists here at LavaMoat.
                        // note: `record` and `source` are non-extensible,
                        // which is why the shallow clones are needed
                        if (isRecordModuleDescriptor(moduleDescriptor)) {
                          if (
                            !moduleDescriptor.record.imports.includes(
                              moduleDescriptorName
                            )
                          ) {
                            moduleDescriptor.record = {
                              ...moduleDescriptor.record,
                              imports: [
                                ...moduleDescriptor.record.imports,
                                // XXX: is this what we want?
                                // compartmentDescriptor.name ??
                                // are they the same?
                                moduleDescriptorName,
                              ],
                            }
                          }
                        } else if (isSourceModuleDescriptor(moduleDescriptor)) {
                          if (
                            !moduleDescriptor.source.imports.includes(
                              moduleDescriptorName
                            )
                          ) {
                            moduleDescriptor.source = {
                              ...moduleDescriptor.source,
                              imports: [
                                ...moduleDescriptor.source.imports,
                                moduleDescriptorName,
                              ],
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              return moduleDescriptor
            }
          : undefined
      super({ ...options, importHook: wrapper })
    }
  }
}
