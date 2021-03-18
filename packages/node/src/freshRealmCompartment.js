const vm = require('vm')
const { getSesShimSrc } = require('lavamoat-core/src/generatePrelude')

module.exports = { createFreshRealmCompartment }

let sesCompartmentSrc

function createFreshRealmCompartment () {
  // lazily load the Compartment source
  if (!sesCompartmentSrc) {
    sesCompartmentSrc = getSesShimSrc()
  }
  // create a seperate realm for running code
  const context = vm.createContext()
  // circular ref (used when globalThis is not present)
  const needsGlobalThisPath = vm.runInContext('typeof globalThis === "undefined"', context)
  if (needsGlobalThisPath) {
    context.globalThis = context
  }
  // run the ses compartment shim, but dont call lockdown
  vm.runInContext(sesCompartmentSrc, context)
  // create the compartment in the other realm
  const compartment = vm.runInContext('new Compartment()', context)
  return compartment
}
