import 'ses'
lockdown()

import { importLocation } from '@endo/compartment-mapper'
import { evadeCensor } from '@endo/evasive-transform'
import { applySourceTransforms } from 'lavamoat-core'
import fs from 'node:fs'
import { toEndoPolicy } from './policy-converter.js'

export * from './constants.js'
export * from './policy-converter.js'

const { freeze, keys, assign } = Object
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

// TODO: need function which accepts filepath and policy
// use a hardcoded policy for now
/**
 *
 * @type {import('@endo/compartment-mapper').ReadFn}
 */
const defaultReadPower = async (location) =>
  fs.promises.readFile(new URL(location).pathname)

/**
 * @type {import('@endo/compartment-mapper').ExitModuleImportHook}
 */
export const importHook = async (specifier) => {
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

/**
 *
 * @param {unknown} value
 * @returns {value is RunOptionsWithEndoPolicy}
 */
function isRunOptionsWithEndoPolicy(value) {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'endoPolicy' in value &&
      typeof value.endoPolicy === 'object'
  )
}

/**
 * Options for {@link run}
 *
 * @typedef RunOptions
 * @property {import('@endo/compartment-mapper').ReadFn} [readPower]
 * @property {import('./policy-converter.js').LavaMoatEndoPolicy} [endoPolicy]
 */

/**
 * Options for {@link run} where {@link RunOptions.endoPolicy} is required
 *
 * @typedef {import('type-fest').SetRequired<RunOptions, 'endoPolicy'>} RunOptionsWithEndoPolicy
 */

/**
 * Runs a program in endomoat given an Endo policy
 *
 * @overload
 * @param {string|URL} entrypointPath
 * @param {RunOptionsWithEndoPolicy} opts
 * @returns {Promise<unknown>}
 */

/**
 * Runs a program in endomoat given a LavaMoat policy
 *
 * @overload
 * @param {string|URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy} policy
 * @param {RunOptions} [opts]
 * @returns {Promise<unknown>}
 */

/**
 * Runs a program in endomoat
 * @param {string|URL} entrypointPath
 * @param {import('lavamoat-core').LavaMoatPolicy|RunOptionsWithEndoPolicy} policyOrOpts
 * @param {RunOptions} [opts]
 * @returns {Promise<unknown>}
 */
export async function run(entrypointPath, policyOrOpts, opts = {}) {
  /** @type {import('./policy-converter.js').LavaMoatEndoPolicy} */
  let policy
  if (isRunOptionsWithEndoPolicy(policyOrOpts)) {
    opts = policyOrOpts
    policy = policyOrOpts.endoPolicy
  } else {
    policy = toEndoPolicy(policyOrOpts)
  }
  const { readPower = defaultReadPower } = opts

  const { namespace } = await importLocation(readPower, `${entrypointPath}`, {
    policy,
    globals: globalThis,
    importHook,
    moduleTransforms: {
      cjs: createModuleTransform('cjs'),
      mjs: createModuleTransform('mjs'),
    },
  })
  return namespace
}

/**
 * Create module transform which performs source transforms to evade SES
 * restrictions
 *
 * @param {import('@endo/compartment-mapper').Language} parser
 * @returns {import('@endo/compartment-mapper').ModuleTransform}
 */
function createModuleTransform(parser) {
  return async (sourceBytes, specifier, location, _packageLocation, opts) => {
    let source = textDecoder.decode(sourceBytes)
    // FIXME: this function calls stuff we could get in `ses/tools.js`
    // except `evadeDirectEvalExpressions`. unclear if we should be using this from `lavamoat-core`
    source = applySourceTransforms(source)
    const { code, map } = await evadeCensor(source, {
      sourceMap: opts?.sourceMap,
      sourceUrl: new URL(specifier, location).href,
      sourceType: 'module',
    })
    const objectBytes = textEncoder.encode(code)
    return { bytes: objectBytes, parser, map }
  }
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
