import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'

const { freeze, keys, assign } = Object

/**
 * @import {ExitModuleImportHook, ExitModuleImportNowHook} from '@endo/compartment-mapper'
 * @import {ThirdPartyStaticModuleInterface} from 'ses'
 */

/**
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
 * @type {ExitModuleImportNowHook}
 * @internal
 */
export const importNowHook = (specifier, packageLocation) => {
  const require = Module.createRequire(fileURLToPath(packageLocation))
  /** @type {object} */
  const ns = require(specifier)
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
