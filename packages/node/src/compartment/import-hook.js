/**
 * Provides exit module hooks for Node.js builtins
 *
 * @packageDocumentation
 * @internal
 */

import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'

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
  /** @type {object} */
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
 * The "null" import hook is for use during policy generation; it prevents
 * importing of exit modules and is the recommended way to handle exit modules
 * when using `captureFromMap()`
 *
 * @type {ExitModuleImportHook}
 * @internal
 */
export const nullImportHook = async () => {
  /** @type {object} */
  return freeze({
    imports: [],
    exports: [],
    execute: () => {},
  })
}
