const test = require('ava')
const { evaluateCapabilities } = require('../src/endowmentsToolkit.js')
require('ses')

// Mirrors the webpack runtime and @lavamoat/node preamble: capabilities are
// evaluated between repairIntrinsics() and hardenIntrinsics()
repairIntrinsics({ errorTaming: 'unsafe' })

test('capability sources evaluate after repairIntrinsics()', (t) => {
  const globalRef = {}
  globalThis.myGlobal = 42 // actual globals are reachable
  const { repairs, capabilities } = evaluateCapabilities({
    sources: [
      `repair((g) => { g.repaired = true })
       defineCapability('cap', {
         ambient: false,
         endow({ endowments }) {
           endowments.result = myGlobal
           endowments.realArray = Array
         },
       })`,
    ],
    globalRef,
  })
  repairs.forEach((repair) => repair())
  t.true(globalRef.repaired)
  const endowments = {}
  capabilities.get('cap').endow({
    options: [],
    endowments,
    compartmentGlobalThis: {},
    rootCompartmentGlobalThis: {},
  })
  t.is(endowments.result, 42)
  t.is(endowments.realArray, Array)
})
