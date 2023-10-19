import 'ses'

export * from './policy-converter.js'
export * from './constants.js'

// TODO: need function which accepts filepath and policy
// use a hardcoded policy for now

export const importHook = async (specifier) => {
  const ns = await import(specifier)
  return Object.freeze({
    imports: [],
    exports: Object.keys(ns),
    execute: (moduleExports) => {
      moduleExports.default = ns
      Object.assign(moduleExports, ns)
    },
  })
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
