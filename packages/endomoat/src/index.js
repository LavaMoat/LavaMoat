import 'ses'
import { evadeCensor } from '@endo/evasive-transform'
import { toEndoPolicy } from './policy-converter.js'
import fs from 'node:fs'
import { importLocation } from '@endo/compartment-mapper'

export * from './policy-converter.js'
export * from './constants.js'

const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

// TODO: need function which accepts filepath and policy
// use a hardcoded policy for now
/**
 *
 * @type {import('@endo/compartment-mapper').ReadFn}
 */
const readPower = async (location) =>
  fs.promises.readFile(new URL(location).pathname)

/**
 * @type {import('@endo/compartment-mapper').ExitModuleImportHook}
 */
export const importHook = async (specifier) => {
  const ns = await import(specifier)
  return Object.freeze(
    /** @type {import('ses').ThirdPartyStaticModuleInterface} */ ({
      imports: [],
      exports: Object.keys(ns),
      execute: (moduleExports) => {
        moduleExports.default = ns
        Object.assign(moduleExports, ns)
      },
    })
  )
}

/**
 *
 * @param {string} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 */
export const run = async (entrypointPath, policy) => {
  const { namespace } = await importLocation(readPower, entrypointPath, {
    policy: toEndoPolicy(policy),
    globals: globalThis,
    importHook,
    moduleTransforms: {
      async mjs(
        sourceBytes,
        specifier,
        location,
        _packageLocation,
        { sourceMap }
      ) {
        const source = textDecoder.decode(sourceBytes)
        const { code, map } = await evadeCensor(source, {
          sourceMap,
          sourceUrl: new URL(specifier, location).href,
          sourceType: 'module',
        })
        const objectBytes = textEncoder.encode(code)
        return { bytes: objectBytes, parser: 'mjs', map }
      },
    },
  })
  return namespace
}

// call importlocation with this importhook, readpower, (converted) policy
// return value of importlocation, but for programmatic usage.
//function mainFunction(...args) {
// what do we pass to importlocation's `globals` option?
// option 1. perform part of lavamoat that creates a copy of globals and makes fetch work etc
// this is in endowmentsToolkit copyWrappedGlobals
// usage example in webpack plugin
// option 2. attenuators are referenced by name. bootstrap the attenuator with these globals somehow.
// option 2.1: introduce new feature to endo which allows providing an attenuator as a reference to in-memory function/object (not a string)
//}
