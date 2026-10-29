const test = require('ava')
const { evaluateCapabilities } = require('../src/endowmentsToolkit.js')
require('ses')

// Mirrors the webpack runtime and @lavamoat/node preamble: capabilities are
// evaluated between repairIntrinsics() and hardenIntrinsics()
repairIntrinsics({ errorTaming: 'unsafe' })

test('capability sources evaluate after repairIntrinsics()', (t) => {
  const globalRef = { myGlobal: 42 }
  const { repairs, capabilities } = evaluateCapabilities({
    sources: [
      `repair((g) => { g.repaired = true })
       defineCapability('cap', { result: myGlobal, realArray: Array })`,
    ],
    globalRef,
  })
  repairs.forEach((repair) => repair())
  t.true(globalRef.repaired)
  t.is(capabilities.get('cap').result, 42)
  t.is(capabilities.get('cap').realArray, Array)
})
