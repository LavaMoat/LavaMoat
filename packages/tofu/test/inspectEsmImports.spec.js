const test = require('ava')
const { parse, inspectEsmImports } = require('../src/index')

testInspect(
  'esm - basic',
  {},
  `
  import fs from 'fs'
`,
  ['fs']
)

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
testInspect(
  'esm - full set',
  {},
  `
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
  export * as name3 from "package12";
  export { name4 } from "package13";
  export { default as name5 } from "package14";
  import defaultExport4, { namedExport } from "package15";
  import { "kebab-case" as kebabCase } from "package16";
  export { "with-hyphen" as withHyphen } from "package17";
  export * from 'package18';
  export const foo = "bar";
`,
  [
    'package01', // default import - no keypath
    'package02', // namespace import - no keypath
    'package03.export1', // named import - keypath
    'package04.export2', // named import with alias - keypath with original name
    'package05.export3', // multiple named imports - keypath for each
    'package05.export4',
    'package06/path/to/specific/un-exported/file.export5', // named imports with path - keypath
    'package06/path/to/specific/un-exported/file.export6',
    'package07.export7', // named imports with alias - keypath
    'package07.export8',
    'package08', // default import - no keypath
    'package09', // default + namespace import - no keypath
    'package10', // side-effect import - no keypath
    'package12', // namespace re-export - no keypath
    'package13.name4', // named re-export - keypath
    'package14', // default re-export - no keypath
    'package15', // mixed default + named import - module for default
    'package15.namedExport', // mixed default + named import - keypath for named
    'package16.kebab-case', // string literal named import - keypath with string literal
    'package17.with-hyphen', // string literal named re-export - keypath with string literal
    'package18', // export * from - no keypath
  ]
)

testInspect(
  'esm - named imports and re-exports with keypaths',
  {},
  `
  import { read } from 'fs';
  import { read as read4 } from 'fs';
  export { read as read5 } from 'fs';
`,
  [
    'fs.read', // all three statements refer to same export, deduplicated to one
  ]
)

test('esm - when searching among zero elements, find zero elements', (t) => {
  const ast = parse(
    `
  import { stuff } from './stuff.mjs';
  import a from 'a';
  `,
    { sourceType: 'module' }
  )
  const actual = inspectEsmImports(ast, [])
  t.is(actual.length, 0)
})

function testInspect(label, opts, fn, expected) {
  test(label, (t) => {
    const source = fnToCodeBlock(fn)
    const ast = parse(source, { sourceType: 'module' })
    const actual = inspectEsmImports(ast)
    const sortedActual = [...actual].sort()
    const sortedExpected = [...expected].sort()

    t.deepEqual(sortedActual, sortedExpected)
  })
}

function fnToCodeBlock(fn) {
  const output = typeof fn === 'function' ? `(${fn})()` : `${fn}`
  return output
}
