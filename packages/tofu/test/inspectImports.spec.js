const test = require('ava')
const deepEqual = require('deep-equal')
const { parse, inspectImports } = require('../src/index')

testInspect(
  'cjs - basic',
  {},
  () => {
    const fs = require('node:fs')
    module.exports = fs
  },
  {
    cjsImports: ['node:fs'],
  }
)

testInspect(
  'cjs - shadowed require',
  {},
  () => {
    const require = () => {}
    require('node:fs')
  },
  {
    cjsImports: [],
  }
)

testInspect(
  'cjs - include even if require result not stored in variable',
  {},
  () => {
    require('node:fs').readFileSync
  },
  {
    cjsImports: ['node:fs.readFileSync'],
  }
)

testInspect(
  'cjs - nesting works off of a variable',
  {},
  () => {
    const fs = require('node:fs')
    fs.readFileSync
  },
  {
    cjsImports: ['node:fs.readFileSync'],
  }
)

testInspect(
  'cjs - include even if declared var is unused',
  {},
  () => {
    // eslint-disable-next-line no-unused-vars
    const rfs = require('node:fs').readFileSync
  },
  {
    cjsImports: ['node:fs.readFileSync'],
  }
)

testInspect(
  'cjs - include if no prefix for builtin provided',
  {},
  () => {
    // eslint-disable-next-line node-import/prefer-node-protocol
    require('fs').readFileSync
  },
  {
    cjsImports: ['fs.readFileSync'],
  }
)

// testInspect('cjs - require rename', {}, () => {
//   const require2 = require
//   require2('fs')
// }, {
//   cjsImports: ['fs'],
// })

testInspect(
  'cjs - basic destructure',
  {},
  () => {
    const { readFileSync, createReadStream } = require('node:fs')
    readFileSync()
    createReadStream()
  },
  {
    cjsImports: ['node:fs.readFileSync', 'node:fs.createReadStream'],
  }
)

testInspect(
  'cjs - basic member',
  {},
  () => {
    const rfs = require('node:fs').readFileSync
    rfs()
  },
  {
    cjsImports: ['node:fs.readFileSync'],
  }
)

testInspect(
  'cjs - mixed destructuring and member',
  {},
  () => {
    const {
      constructor: {
        name: [bigEff],
      },
    } = require('node:fs').readFileSync
    bigEff()
  },
  {
    cjsImports: ['node:fs.readFileSync.constructor.name.0'],
  }
)

testInspect(
  'cjs - usage basic',
  {},
  () => {
    const fs = require('node:fs')
    fs.readFileSync()
    fs.createReadStream()
  },
  {
    cjsImports: ['node:fs.readFileSync', 'node:fs.createReadStream'],
  }
)

testInspect(
  'cjs - usage advanced',
  {},
  () => {
    // eslint-disable-next-line n/prefer-global/process
    const { sourceUrl: url } = require('node:process').release
    url.includes('v12')
  },
  {
    cjsImports: ['node:process.release.sourceUrl.includes'],
  }
)

test('cjs - when searching among zero elements, find zero elements', (t) => {
  const ast = parse(
    `
  require('./stuff')
  require('a')
  `,
    { sourceType: 'script' }
  )
  const { cjsImports: actual } = inspectImports(ast, [])
  t.is(actual.length, 0)
})

function testInspect(label, opts, fn, expectedResultObj) {
  test(label, (t) => {
    const source = fnToCodeBlock(fn)
    const ast = parse(source)
    const result = inspectImports(ast)
    const resultSorted = [...Object.entries(result)].sort(sortBy(0))
    const expectedSorted = Object.entries(expectedResultObj).sort(sortBy(0))

    // for debugging
    if (!deepEqual(resultSorted, expectedSorted)) {
      label, opts
      t.log(resultSorted)
      t.log(expectedSorted)
      // eslint-disable-next-line no-debugger
      debugger
    }

    t.deepEqual(resultSorted, expectedSorted)
  })
}

function sortBy(key) {
  return (a, b) => {
    const vA = a[key]
    const vB = b[key]
    if (vA === vB) {
      return 0
    }
    return vA > vB ? 1 : -1
  }
}

function fnToCodeBlock(fn) {
  return `(${fn})()`
}
