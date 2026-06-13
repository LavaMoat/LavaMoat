/**
 * Utilities for building `additionalLocations` entries for
 * `@endo/compartment-mapper`.
 *
 * @packageDocumentation
 * @internal
 */

import path from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * @import {MapNodeModulesOptions} from "@endo/compartment-mapper"
 * @import {LavaMoatPolicy} from "@lavamoat/types"
 */

/**
 * Builds {@link MapNodeModulesOptions.additionalLocations} from a
 * {@link LavaMoatPolicy}.
 *
 * @param {LavaMoatPolicy} [policy]
 * @param {string} [projectRoot]
 * @returns {MapNodeModulesOptions['additionalLocations']}
 */
export const buildAdditionalLocations = (
  policy,
  projectRoot = process.cwd()
) => {
  const additionalLocations = new Set()
  for (const additionalLocation of policy?.additionalLocations ?? []) {
    if (typeof additionalLocation === 'string') {
      additionalLocations.add({
        location: pathToFileURL(
          path.join(projectRoot, additionalLocation, './')
        ).href,
      })
    } else {
      const { location, modules } = additionalLocation
      if (modules) {
        additionalLocations.add({
          location: pathToFileURL(path.join(projectRoot, location, './')).href,
          modules,
        })
      } else {
        additionalLocations.add({
          location: pathToFileURL(path.join(projectRoot, location, './')).href,
        })
      }
    }
  }
  return [...additionalLocations]
}
