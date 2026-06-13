/**
 * Utilities for building `additionalLocations` entries for
 * `@endo/compartment-mapper`.
 *
 * @packageDocumentation
 * @internal
 */

import path from 'node:path'
import {
  isIncludeEntryByLocation,
  isIncludeEntryByName,
  isString,
  toFileURLString,
} from '../util.js'
import { hrPath } from '../format.js'
import { GenerationError, InvalidPolicyError } from '../error.js'

/**
 * @import {
 *   MapNodeModulesOptions,
 *   PackageCompartmentMapDescriptor,
 *   PreloadOption
 * } from '@endo/compartment-mapper'
 * @import {
 *   IncludeEntryByLocation,
 *   IncludeEntryByName,
 *   IncludePolicy
 * } from '@lavamoat/types'
 */

/**
 * Builds {@link MapNodeModulesOptions.additionalLocations} from
 * {@link LavaMoatPolicy.include}.
 *
 * @param {IncludePolicy[]} [includes] {@link LavaMoatPolicy.include}
 * @param {Object} [options] Options
 * @param {string} [options.projectRoot] Project root
 * @returns {NonNullable<MapNodeModulesOptions['additionalLocations']>}
 */
export const buildAdditionalLocations = (
  includes = [],
  { projectRoot = process.cwd() } = {}
) =>
  includes.reduce((acc, include) => {
    if (isIncludeEntryByLocation(include)) {
      if (include.location.startsWith('..')) {
        throw new InvalidPolicyError(
          `Include location cannot ascend above the project root (${hrPath(projectRoot)}): ${hrPath(include.location)}`
        )
      }
      const location = toFileURLString(
        path.join(projectRoot, include.location, '/')
      )
      if (include.modules?.length) {
        if (include.modules.some((module) => module.startsWith('..'))) {
          throw new InvalidPolicyError(
            `Include module path(s) cannot ascend above the location (${hrPath(include.location)}): ${include.modules.join(', ')}`
          )
        }
        return [...acc, { location, modules: include.modules }]
      }
      return [...acc, { location }]
    }
    return acc
  }, /** @type {NonNullable<MapNodeModulesOptions['additionalLocations']>} */ ([]))

/**
 * Builds {@link CaptureLiteOptions._preload} from {@link LavaMoatPolicy.include}.
 *
 * The resulting array will contain all `string` values and
 * {@link IncludeEntryByName} objects from {@link IncludePolicy} objects.
 *
 * Note that this will result in _n_ entries for each {@link IncludeEntryByName}
 * object, where _n_ is the number of modules in
 * {@link IncludeEntryByName.modules} (or `1`; whichever is greater).
 *
 * @param {PackageCompartmentMapDescriptor} packageCompartmentMap
 * @param {IncludePolicy[]} includes {@link LavaMoatPolicy.include}
 * @param {Object} [options] Options
 * @param {string} [options.projectRoot] Project root
 * @returns {NonNullable<PreloadOption['_preload']>}
 */
export const buildPreloads = (
  packageCompartmentMap,
  includes = [],
  { projectRoot = process.cwd() } = {}
) => {
  /**
   * @param {IncludeEntryByName} include
   * @returns {NonNullable<PreloadOption['_preload']>}
   */
  const handleIncludeEntryByName = (include) =>
    include.modules?.length
      ? include.modules.map((module) => ({
          compartment: include.name,
          entry: module,
        }))
      : [{ compartment: include.name, entry: '.' }]

  /**
   * @param {IncludeEntryByLocation} include
   * @returns {NonNullable<PreloadOption['_preload']>}
   */
  const handleIncludeEntryByLocation = (include) => {
    if (include.location.startsWith('..')) {
      throw new InvalidPolicyError(
        `Include location cannot ascend above the project root (${hrPath(projectRoot)}): ${hrPath(include.location)}`
      )
    }
    const compartmentName = toFileURLString(
      path.join(projectRoot, include.location, '/')
    )
    const compartment = packageCompartmentMap.compartments[compartmentName]
    if (!compartment) {
      throw new GenerationError(
        `Compartment ${hrPath(compartmentName)} not found in packageCompartmentMap`
      )
    }

    return include.modules?.length
      ? include.modules.map((module) => ({
          compartment: compartment.label,
          entry: module,
        }))
      : [{ compartment: compartment.label, entry: '.' }]
  }

  // this could have been a beautiful nested ternary
  return includes.reduce((acc, include) => {
    if (isString(include)) {
      return [...acc, include]
    }
    if (isIncludeEntryByName(include)) {
      return [...acc, ...handleIncludeEntryByName(include)]
    }
    if (isIncludeEntryByLocation(include)) {
      return [...acc, ...handleIncludeEntryByLocation(include)]
    }
    return acc
  }, /** @type {NonNullable<PreloadOption['_preload']>} */ ([]))
}
