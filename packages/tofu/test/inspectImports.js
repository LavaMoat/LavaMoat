const test = require('tape')
const deepEqual = require('deep-equal')
const acornGlobals = require('acorn-globals')
const { inspectImports } = require('../src/index')


testInspect('cjs - basic', {}, () => {
  const fs = require('fs')
}, {
  cjsImports: ['fs'],
})

testInspect('cjs - basic destructure', {}, () => {
  const { readFileSync, createReadStream } = require('fs')
}, {
  cjsImports: [
    'fs.readFileSync',
    'fs.createReadStream',
  ],
})

testInspect('cjs - basic member', {}, () => {
  const rfs = require('fs').readFileSync
}, {
  cjsImports: ['fs.readFileSync'],
})

testInspect('cjs - mixed destructuring and member', {}, () => {
  const { constructor: { name: [bigEff] } } = require('fs').readFileSync
}, {
  cjsImports: ['fs.readFileSync.constructor.name.0'],
})

function testInspect (label, opts, fn, expectedResultObj) {
  test(label, (t) => {
    const source = fnToCodeBlock(fn)
    const ast = acornGlobals.parse(source)
    const result = inspectImports(ast, opts)
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
    t.end()
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
