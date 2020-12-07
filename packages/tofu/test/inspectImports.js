const test = require('ava')
const deepEqual = require('deep-equal')
const { parse, inspectImports } = require('../src/index')

testInspect('cjs - basic', {}, () => {
  const fs = require('fs')
  module.exports = fs
}, {
  cjsImports: ['fs']
})

testInspect('cjs - shadowed require', {}, () => {
  const require = () => {}
  require('fs')
}, {
  cjsImports: []
})

testInspect('cjs - include even if require result not stored in variable', {}, () => {
  require('fs').readFileSync
}, {
  cjsImports: ['fs.readFileSync']
})

testInspect('cjs - include even if declared var is unused', {}, () => {
  const rfs = require('fs').readFileSync
}, {
  cjsImports: ['fs.readFileSync']
})

// testInspect('cjs - require rename', {}, () => {
//   const require2 = require
//   require2('fs')
// }, {
//   cjsImports: ['fs'],
// })

testInspect('cjs - basic destructure', {}, () => {
  const { readFileSync, createReadStream } = require('fs')
  readFileSync()
  createReadStream()
}, {
  cjsImports: [
    'fs.readFileSync',
    'fs.createReadStream'
  ]
})

testInspect('cjs - basic member', {}, () => {
  const rfs = require('fs').readFileSync
  rfs()
}, {
  cjsImports: ['fs.readFileSync']
})

testInspect('cjs - mixed destructuring and member', {}, () => {
  const { constructor: { name: [bigEff] } } = require('fs').readFileSync
  bigEff()
}, {
  cjsImports: ['fs.readFileSync.constructor.name.0']
})

testInspect('cjs - usage basic', {}, () => {
  const fs = require('fs')
  fs.readFileSync()
  fs.createReadStream()
}, {
  cjsImports: [
    'fs.readFileSync',
    'fs.createReadStream'
  ]
})

testInspect('cjs - usage advanced', {}, () => {
  const { sourceUrl: url } = require('process').release
  url.includes('v12')
}, {
  cjsImports: [
    'process.release.sourceUrl.includes'
  ]
})

function testInspect (label, opts, fn, expectedResultObj) {
  test(label, (t) => {
    const source = fnToCodeBlock(fn)
    const ast = parse(source)
    const result = inspectImports(ast)
    const resultSorted = [...Object.entries(result)].sort(sortBy(0))
    const expectedSorted = Object.entries(expectedResultObj).sort(sortBy(0))

    // for debugging
    if (!deepEqual(resultSorted, expectedSorted)) {
      label, opts
      console.log(resultSorted)
      console.log(expectedSorted)
      debugger
    }

    t.deepEqual(resultSorted, expectedSorted)
      })
}

function sortBy (key) {
  return (a, b) => {
    const vA = a[key]; const vB = b[key]
    if (vA === vB) return 0
    return vA > vB ? 1 : -1
  }
}

function fnToCodeBlock (fn) {
  return `(${fn})()`
}
