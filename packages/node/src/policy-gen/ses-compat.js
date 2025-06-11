/**
 * Provides {@link makeSesCompatListener} to aggregate SES compat warnings coming
 * out of `lavamoat-core`'s `ModuleInspector`.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @import {SesViolationType} from '../internal.js'
 * @import {LavamoatModuleRecord, SesCompat, SesCompatObj} from 'lavamoat-core'
 * @import {Loggerr} from 'loggerr'
 */

import chalk from 'chalk'
import { stripVTControlCharacters } from 'node:util'
import { SES_VIOLATION_TYPES } from '../constants.js'
import { hrPath } from '../format.js'
import { log as defaultLog } from '../log.js'
const { keys } = Object

/**
 * Creates a listener for the `compat-warning` event emitted by a module
 * inspector. Populates the provided data structures
 *
 * @param {Map<string, Partial<Record<SesViolationType, string[]>>>} perPackageWarnings
 * @param {Set<SesViolationType>} foundViolationTypes
 * @param {{ log?: Loggerr }} [options]
 * @returns {(data: {
 *   moduleRecord: LavamoatModuleRecord
 *   compatWarnings: SesCompat
 * }) => void}
 */
export const makeSesCompatListener =
  (perPackageWarnings, foundViolationTypes, { log = defaultLog } = {}) =>
  (data) => {
    const { moduleRecord, compatWarnings } = /**
     * @type {{
     *   moduleRecord: LavamoatModuleRecord
     *   compatWarnings: SesCompat
     * }}
     */ (data)

    const { primordialMutations, strictModeViolations, dynamicRequires } =
      compatWarnings
    const nicePath = hrPath(moduleRecord.file)

    /** @type {Partial<Record<SesViolationType, string[]>>} */
    const warnings = perPackageWarnings.get(moduleRecord.packageName) || {}

    /**
     * Adds SES compat issues to {@link warnings}
     *
     * @param {SesCompatObj[]} sesCompatObjs
     * @param {SesViolationType} type
     */
    const addWarnings = (sesCompatObjs, type) => {
      if (sesCompatObjs.length) {
        foundViolationTypes.add(type)
        const warningsByType = warnings[type] ?? []
        warningsByType.push(
          ...sesCompatObjs.map(
            ({
              node: {
                loc: {
                  start: { line, column },
                },
              },
            }) => {
              const plainPath = stripVTControlCharacters(nicePath)
              return `- ${chalk.yellowBright([plainPath, line, column].join(chalk.yellow(':')))} ${chalk.cyan(`(${type})`)}`
            }
          )
        )
        warnings[type] = warningsByType
      }
    }

    addWarnings(primordialMutations, SES_VIOLATION_TYPES.PrimordialMutation)
    addWarnings(strictModeViolations, SES_VIOLATION_TYPES.StrictModeViolation)
    addWarnings(dynamicRequires, SES_VIOLATION_TYPES.DynamicRequires)

    /* c8 ignore next */
    if (!keys(warnings).length) {
      // unlikely, but just in case
      log.warning(
        'empty "compat-warning" event received from module inspector; this is a bug'
      )
      return
    }

    perPackageWarnings.set(moduleRecord.packageName, warnings)
  }
