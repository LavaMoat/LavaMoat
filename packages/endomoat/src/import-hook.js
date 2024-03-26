import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'

const { freeze, keys, assign } = Object

/**
 * Import hook which should handle builtins and native modules.
 *
 * @type {import('@endo/compartment-mapper').ExitModuleImportHook}
 */
export const importHook = async (specifier) => {
  /** @type {object} */
  const ns = await import(specifier)
  return freeze(
    /** @type {import('ses').ThirdPartyStaticModuleInterface} */ ({
      imports: [],
      exports: keys(ns),
      execute: (moduleExports) => {
        moduleExports.default = ns
        assign(moduleExports, ns)
      },
    })
  )
}

/** @type {import('@endo/compartment-mapper').DynamicImportHook} */
export const importNowHook = (specifier, packageLocation) => {
  const require = Module.createRequire(fileURLToPath(packageLocation))
  /** @type {object} */
  const ns = require(specifier)
  return freeze(
    /** @type {import('ses').ThirdPartyStaticModuleInterface} */ ({
      imports: [],
      exports: keys(ns),
      execute: (moduleExports) => {
        moduleExports.default = ns
        assign(moduleExports, ns)
      },
    })
  )
}
