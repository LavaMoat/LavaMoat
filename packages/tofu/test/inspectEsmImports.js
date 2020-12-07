const test = require('ava')
const deepEqual = require('deep-equal')
const { parse, inspectEsmImports } = require('../src/index')

testInspect('esm - basic', {}, `
  import fs from 'fs'
`, {
  esmImports: ['fs']
})

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
testInspect('esm - full set', {}, `
  import defaultExport0 from "package01";
  import * as name1 from "package02";
  import { export1 } from "package03";
  import { export2 as alias1 } from "package04";
  import { export3, export4 } from "package05";
  import { export5, export6 } from "package06/path/to/specific/un-exported/file";
  import { export7, export8 as alias2 } from "package07";
  import defaultExport2 from "package08";
  import defaultExport3, * as name2 from "package09";
  import "package10";
  var promise = import("package11");
`, {
  esmImports: [
    'package01',
    'package02',
    'package03.export1',
    'package04.export2',
    'package05.export3',
    'package05.export4',
    'package06/path/to/specific/un-exported/file.export5',
    'package06/path/to/specific/un-exported/file.export6',
    'package07.export7',
    'package07.export8',
    'package08',
    'package09',
    'package09'
  ]
})

function testInspect (label, opts, fn, expectedResultObj) {
  test(label, (t) => {
    const source = fnToCodeBlock(fn)
    const ast = parse(source, { sourceType: 'module' })
    const result = inspectEsmImports(ast)
    const resultSorted = [...Object.entries(result)].sort(sortBy(0))
    const expectedSorted = Object.entries(expectedResultObj).sort(sortBy(0))

    // for debugging
    if (!deepEqual(resultSorted, expectedSorted)) {
      label, opts, ast, source
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
  const output = typeof fn === 'function' ? `(${fn})()` : `${fn}`
  return output
}
