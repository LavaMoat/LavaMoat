const test = require('ava')
const { parse, inspectSesCompat } = require('../src/index')

// some input from https://www.geeksforgeeks.org/strict-mode-javascript/

function inspectSesCompatTest (code) {
  const ast = parse(code, {
    sourceType: 'module',
    errorRecovery: true
  })
  return inspectSesCompat(ast)
}

test('inspectSesCompat - allowed primordial assignment', (t) => {
  const results = inspectSesCompatTest(`
    Error.stackTraceLimit = 42
  `)
  t.deepEqual(results.primordialMutations, [])
  })

test('inspectSesCompat - disallowed primordial assignment', (t) => {
  const results = inspectSesCompatTest(`
    Error.xyz = 42
  `)
  t.deepEqual(results.primordialMutations.length, 1)
  })

test('inspectSesCompat - strict mode - reserved word', (t) => {
  const results = inspectSesCompatTest(`
    const package = 'lavamoat'
  `)
  t.deepEqual(results.strictModeViolations.length, 1)
  })

test('inspectSesCompat - strict mode - deleting a variable', (t) => {
  const results = inspectSesCompatTest(`
    delete xyz
  `)
  t.deepEqual(results.strictModeViolations.length, 1)
  })

test('inspectSesCompat - strict mode - octal literals', (t) => {
  const results = inspectSesCompatTest(`
    let x = 010
  `)
  t.deepEqual(results.strictModeViolations.length, 1)
  })

test('inspectSesCompat - strict mode - escaped octal literals', (t) => {
  const results = inspectSesCompatTest(`
    let x = \\010
  `)
  t.deepEqual(results.strictModeViolations.length, 1)
  })

test('inspectSesCompat - strict mode - "with" keyword', (t) => {
  const results = inspectSesCompatTest(`
    with (Math) { x = cos(2) }
  `)
  t.deepEqual(results.strictModeViolations.length, 1)
  })

// test('inspectSesCompat - assignment to undeclared globals', (t) => {
//   const results = inspectSesCompatTest(`
//     xyz = 42
//   `)
//   t.deepEqual(results.strictModeViolations.length, 1)
//   // })
