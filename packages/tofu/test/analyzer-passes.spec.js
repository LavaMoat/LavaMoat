const test = require('ava')
const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const {
  createGlobalsAnalyzerPass,
  createBuiltinsAnalyzerPass,
  createViolationsAnalyzerPass,
  inspectGlobals,
} = require('../src/index')

test('createGlobalsAnalyzerPass returns an AnalyzerPass', (t) => {
  const pass = createGlobalsAnalyzerPass()
  t.is(typeof pass.visitor, 'object')
  t.is(typeof pass.getResults, 'function')
})

test('globals analyzer detects global references', (t) => {
  const source = `console.log("hello"); process.exit(0);`
  const ast = parse(source, { sourceType: 'script', errorRecovery: true })
  const pass = createGlobalsAnalyzerPass()
  traverse(ast, pass.visitor)
  const results = pass.getResults()
  t.true(results instanceof Map)
  t.true(results.has('console.log'))
  t.true(results.has('process.exit'))
})

test('globals analyzer matches inspectGlobals output', (t) => {
  const source = `console.log("hello"); process.exit(0);`
  const ast = parse(source, { sourceType: 'script', errorRecovery: true })

  const pass = createGlobalsAnalyzerPass()
  traverse(ast, pass.visitor)
  const passResults = pass.getResults()

  const directResults = inspectGlobals(ast)

  t.deepEqual([...passResults.entries()].sort(), [...directResults.entries()].sort())
})

test('globals analyzer respects ignoredRefs', (t) => {
  const source = `console.log("hello"); process.exit(0);`
  const ast = parse(source, { sourceType: 'script', errorRecovery: true })
  const pass = createGlobalsAnalyzerPass({ ignoredRefs: ['console'] })
  traverse(ast, pass.visitor)
  const results = pass.getResults()
  t.false(results.has('console.log'))
  t.true(results.has('process.exit'))
})

test('createBuiltinsAnalyzerPass detects builtin imports', (t) => {
  const source = `import fs from 'fs'; import path from 'path'; import foo from 'foo';`
  const ast = parse(source, { sourceType: 'module', errorRecovery: true })
  const pass = createBuiltinsAnalyzerPass({ builtinModules: ['fs', 'path'] })
  traverse(ast, pass.visitor)
  const results = pass.getResults()
  t.true(results instanceof Set)
  t.true(results.has('fs'))
  t.true(results.has('path'))
  t.false(results.has('foo'))
})

test('createBuiltinsAnalyzerPass detects require builtins', (t) => {
  const source = `const fs = require('fs'); const foo = require('foo');`
  const ast = parse(source, { sourceType: 'script', errorRecovery: true })
  const pass = createBuiltinsAnalyzerPass({ builtinModules: ['fs'] })
  traverse(ast, pass.visitor)
  const results = pass.getResults()
  t.true(results.has('fs'))
  t.false(results.has('foo'))
})

test('createViolationsAnalyzerPass detects dynamic requires', (t) => {
  const source = `const x = require(someVariable);`
  const ast = parse(source, { sourceType: 'script', errorRecovery: true })
  const pass = createViolationsAnalyzerPass()
  traverse(ast, pass.visitor)
  const results = pass.getResults()
  t.truthy(results)
  t.true(results.dynamicRequires.length > 0)
})

test('createViolationsAnalyzerPass returns null when no violations', (t) => {
  const source = `const x = 1;`
  const ast = parse(source, { sourceType: 'script', errorRecovery: true })
  const pass = createViolationsAnalyzerPass()
  traverse(ast, pass.visitor)
  const results = pass.getResults()
  t.is(results, null)
})
