/**
 * Provides exit module hooks for Node.js builtins
 *
 * @packageDocumentation
 * @internal
 */

import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { isObject } from '../util.js'

const { freeze, keys, assign } = Object

/**
 * @import {ExitModuleImportHook, ExitModuleImportNowHook} from '@endo/compartment-mapper'
 * @import {ThirdPartyStaticModuleInterface} from 'ses'
 */

/**
 * Given some `ns`, create a {@link ThirdPartyStaticModuleInterface}
 *
 * @param {unknown} ns Namespace
 * @returns {Readonly<ThirdPartyStaticModuleInterface>}
 */
const makeStaticModuleInterface = (ns) => {
  const exports = isObject(ns)
    ? new Set([...keys(ns), 'default'])
    : new Set(['default'])
  return freeze(
    /** @type {ThirdPartyStaticModuleInterface} */ ({
      // builtins have no imports (as far as we're concerned)
      imports: [],
      exports: [...exports],
      execute: (moduleExports) => {
        // this is a no-op if `ns` is a non-object
        moduleExports.default = ns
        assign(moduleExports, ns)
      },
    })
  )
}

/**
 * Import hook for exit modules, which are typically Node.js builtins
 *
 * @type {ExitModuleImportHook}
 * @internal
 */
export const importHook = async (specifier) => {
  /** @type {unknown} */
  const ns = await import(specifier)

  return makeStaticModuleInterface(ns)
}

/**
 * Import "now" hook for exit modules, which are typically Node.js builtins.
 *
 * @type {ExitModuleImportNowHook}
 * @internal
 */
export const importNowHook = (specifier, packageLocation) => {
  const require = Module.createRequire(fileURLToPath(packageLocation))

  /** @type {unknown} */
  const ns = require(specifier)
  return makeStaticModuleInterface(ns)
}

/**
 * The "null" import hook is for use during policy generation; it prevents
 * importing of exit modules and is the recommended way to handle exit modules
 * when using `captureFromMap()` (the reason, in a nutshell: different use-cases
 * are sharing the same internal `importHook` implementation in
 * `@endo/compartment-mapper`)
 *
 * @type {ExitModuleImportHook}
 * @internal
 */
export const nullImportHook = async () => {
  return freeze({
    imports: [],
    exports: [],
    execute: () => {},
  })
}
