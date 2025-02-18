/**
 * Provides exit module hooks for Node.js builtins
 *
 * @packageDocumentation
 * @internal
 */

import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { log } from '../log.js'

const { freeze, keys, assign } = Object

/**
 * @import {ExitModuleImportHook, ExitModuleImportNowHook} from '@endo/compartment-mapper'
 * @import {ThirdPartyStaticModuleInterface} from 'ses'
 */

/**
 * Import hook for exit modules, which are typically Node.js builtins in this
 * case.
 *
 * @type {ExitModuleImportHook}
 * @internal
 */
export const importHook = async (specifier) => {
  try {
    /** @type {object} */
    // eslint-disable-next-line @jessie.js/safe-await-separator, @typescript-eslint/no-unsafe-assignment
    const ns = await import(specifier)
    return freeze(
      /** @type {ThirdPartyStaticModuleInterface} */ ({
        imports: [],
        exports: keys(ns),
        execute: (moduleExports) => {
          moduleExports.default = ns
          assign(moduleExports, ns)
        },
      })
    )
  } catch (err) {
    log.error(
      `Error importing ${specifier}: ${/** @type {Error} */ (err).message}`
    )
    throw err
  }
}

/**
 * Import "now" hook for exit modules, which are typically Node.js builtins.
 *
 * @type {ExitModuleImportNowHook}
 * @internal
 */
export const importNowHook = (specifier, packageLocation) => {
  const require = Module.createRequire(fileURLToPath(packageLocation))

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const ns = /** @type {object} */ (require(specifier))
  return freeze(
    /** @type {ThirdPartyStaticModuleInterface} */ ({
      imports: [],
      exports: keys(ns),
      execute: (moduleExports) => {
        moduleExports.default = ns
        assign(moduleExports, ns)
      },
    })
  )
}

/**
 * @type {ExitModuleImportHook}
 * @internal
 */
export const nullImportHook = async () => {
  await Promise.resolve()
  /** @type {object} */
  return freeze(
    /** @type {ThirdPartyStaticModuleInterface} */ ({
      imports: [],
      exports: [],
      execute: () => {},
    })
  )
}
