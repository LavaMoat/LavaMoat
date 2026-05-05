import test from 'ava'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import { createPolicyGenVisitor } from '../../../src/policy-gen/policy-gen-visitor.js'

const { default: traverseBabel } = traverse

/**
 * Runs {@link createPolicyGenVisitor} against a source string and returns the
 * combined `{ globals, builtins, violations }` result.
 *
 * @param {string} source
 * @param {Parameters<typeof createPolicyGenVisitor>[0]} [options]
 * @param {'script' | 'module'} [sourceType]
 * @returns {ReturnType<ReturnType<typeof createPolicyGenVisitor>['done']>}
 */
const analyzeSource = (source, options = {}, sourceType = 'module') => {
  const ast = parse(source, {
    sourceType,
    tokens: true,
    createParenthesizedExpressions: true,
  })
  const pass = createPolicyGenVisitor(options)
  traverseBabel(ast, pass.visitor)
  return pass.done?.()
}

test('returns an object with globals, builtins, and violations fields', (t) => {
  const result = analyzeSource('export const x = 1;')
  t.true('globals' in result)
  t.true('builtins' in result)
  t.true('violations' in result)
})

test('globals is a Map', (t) => {
  const result = analyzeSource('export const x = 1;')
  t.true(result.globals instanceof Map)
})

test('builtins is a Set', (t) => {
  const result = analyzeSource('export const x = 1;')
  t.true(result.builtins instanceof Set)
})

test('detects global variable access', (t) => {
  const result = analyzeSource('console.log(document.title);')
  t.true(result.globals.size > 0)
})

test('detects ESM builtin imports', (t) => {
  const result = analyzeSource(
    "import fs from 'node:fs'; export const x = fs;",
    { builtinModules: ['node:fs'] }
  )
  t.true(result.builtins.has('node:fs'))
})

test('detects CJS builtin requires', (t) => {
  const result = analyzeSource(
    "const fs = require('node:fs');",
    { builtinModules: ['node:fs'] },
    'script'
  )
  t.true(result.builtins.has('node:fs'))
})

test('returns null violations for clean code', (t) => {
  const result = analyzeSource('export const x = 1;')
  t.is(result.violations, null)
})

test('detects SES violations for primordial mutations', (t) => {
  const result = analyzeSource('Array.prototype.myMethod = function() {};')
  t.not(result.violations, null)
  t.true(
    result.violations !== null &&
      result.violations.primordialMutations.length > 0
  )
})

test('violations have plain location data (structured-clone safe)', (t) => {
  const result = analyzeSource('Array.prototype.myMethod = function() {};')
  t.not(result.violations, null)
  if (!result.violations) return
  for (const violation of result.violations.primordialMutations) {
    t.is(typeof violation.line, 'number')
    t.is(typeof violation.column, 'number')
  }
})

test('throws if done() is called before traversal', (t) => {
  const pass = createPolicyGenVisitor()
  t.throws(() => pass.done?.(), { message: /ast was not captured/i })
})
