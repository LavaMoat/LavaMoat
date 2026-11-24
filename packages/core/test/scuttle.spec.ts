/**
 * Tests for `@lavamoat/core/scuttle`
 *
 * Ported from `lavamoat-core/test/scuttle.spec.js`.
 */

import { readFileSync } from 'node:fs'
import { createContext, runInContext } from 'node:vm'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import test from 'ava'
import 'ses'
import { scuttle } from '../dist/scuttle.js'

// ---------------------------------------------------------------------------
// no-runtime-imports guard
// ---------------------------------------------------------------------------

test('scuttle compiled output has no runtime imports', (t) => {
  const distPath = resolve(
    fileURLToPath(import.meta.url),
    '../../dist/scuttle.js'
  )
  const src = readFileSync(distPath, 'utf8')
  const stripped = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const importLines = stripped
    .split('\n')
    .filter((l) => /^\s*import\b/.test(l) || /^\s*require\s*\(/.test(l))
  t.is(
    importLines.length,
    0,
    `Expected no runtime imports but found:\n${importLines.join('\n')}`
  )
})

// ---------------------------------------------------------------------------
// test helpers
// ---------------------------------------------------------------------------

/**
 * Returns a fresh isolated globalThis for each test, so scuttling one test does
 * not affect others.
 */
function getFreshGlobalThis(): Record<PropertyKey, unknown> {
  const vmContext = createContext()
  const vmGlobalThis = runInContext('globalThis', vmContext) as Record<
    PropertyKey,
    unknown
  >
  const newGlobal: Record<PropertyKey, unknown> = {}
  Object.defineProperties(
    newGlobal,
    Object.getOwnPropertyDescriptors(vmGlobalThis)
  )
  return newGlobal
}

/**
 * Properties that scuttling skips — mirrors the logic in `scuttle.ts`.
 */
const avoidForLavaMoatCompatibility: string[] = (function (
  globalThisCompartment: Record<string, unknown>,
  gt: Record<string, unknown>
) {
  return Object.getOwnPropertyNames(globalThisCompartment)
    .filter((a) => globalThisCompartment[a] === gt[a])
    .concat(['Compartment', 'Error', 'globalThis'])
})(new Compartment().globalThis as Record<string, unknown>, globalThis)

function getPropsGroups(g: Record<PropertyKey, unknown>): {
  all: string[]
  configurables: string[]
} {
  const all = Object.getOwnPropertyNames(g)
  const configurables = all
    .filter(
      (p) =>
        (Object.getOwnPropertyDescriptor(g, p)?.configurable ?? false) ||
        (Object.getOwnPropertyDescriptor(g, p)?.writable ?? false)
    )
    .filter((p) => !avoidForLavaMoatCompatibility.includes(p))
  return { all, configurables }
}

const err = (intrinsic: string): string =>
  'LavaMoat - property "' +
  intrinsic +
  '" of globalThis is inaccessible under ' +
  'scuttling mode. To learn more visit https://github.com/LavaMoat/LavaMoat/issues/2127.'

const SCUTTLER_NAME_ERROR = {
  message:
    'LavaMoat - \'scuttlerName\' function "SCUTTLER" expected on globalRef.' +
    'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/462.',
}

// ---------------------------------------------------------------------------
// tests
// ---------------------------------------------------------------------------

test('scuttle - no opts', (t) => {
  t.plan(1)
  const vmGlobalThis = getFreshGlobalThis()
  const { all } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  t.pass('scuttle with no opts completes without throwing')
})

test('scuttle - opts as bool', (t) => {
  const vmGlobalThis = getFreshGlobalThis()
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, false)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, true)

  const configurablesToThrow = all.filter((p) => configurables.includes(p))
  const configurablesToNotThrow = all.filter((p) => !configurables.includes(p))
  configurablesToThrow.forEach((p) => {
    t.throws(
      () => vmGlobalThis[p],
      { message: err(p) },
      `expected ${p} to throw`
    )
  })
  configurablesToNotThrow.forEach((p) => {
    t.notThrows(() => vmGlobalThis[p], `expected ${p} to not throw`)
  })
})

test('scuttle - opts as object', (t) => {
  const vmGlobalThis = getFreshGlobalThis()
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, {})
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, { enabled: false })
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, { enabled: true })

  const configurablesToThrow = all.filter((p) => configurables.includes(p))
  const configurablesToNotThrow = all.filter((p) => !configurables.includes(p))
  configurablesToThrow.forEach((p) => {
    t.throws(
      () => vmGlobalThis[p],
      { message: err(p) },
      `expected ${p} to throw`
    )
  })
  configurablesToNotThrow.forEach((p) => {
    t.notThrows(() => vmGlobalThis[p], `expected ${p} to not throw`)
  })
})

test('scuttle - exceptions', (t) => {
  const vmGlobalThis = getFreshGlobalThis()
  ;(vmGlobalThis as Record<string, unknown>).AAA1 = (
    vmGlobalThis as Record<string, unknown>
  ).BBB1 = 111
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, {
    enabled: true,
    exceptions: ['/^(AAA|BBB)1$/', 'FinalizationRegistry', 'SharedArrayBuffer'],
  })
  const exceptions = [
    'AAA1',
    'BBB1',
    'FinalizationRegistry',
    'SharedArrayBuffer',
  ]
  // Exceptions stay readable even when they would otherwise be scuttled.
  const configurablesToThrow = all.filter(
    (p) => configurables.includes(p) && !exceptions.includes(p)
  )
  const configurablesToNotThrow = all.filter(
    (p) => !configurables.includes(p) || exceptions.includes(p)
  )
  configurablesToThrow.forEach((p) => {
    t.throws(
      () => vmGlobalThis[p],
      { message: err(p) },
      `expected ${p} to throw`
    )
  })
  configurablesToNotThrow.forEach((p) => {
    t.notThrows(() => vmGlobalThis[p], `expected ${p} to not throw`)
  })
})

test('scuttle - scuttle func', (t) => {
  const vmGlobalThis = getFreshGlobalThis()
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  let globalRef: Record<PropertyKey, unknown> | undefined
  const cb = (
    realm: Record<PropertyKey, unknown>,
    scuttleFn: (realm: Record<PropertyKey, unknown>) => void
  ) => {
    globalRef = realm
    scuttleFn(realm)
  }
  const opts = { enabled: true, scuttlerName: 'SCUTTLER' }
  t.throws(() => scuttle(vmGlobalThis, opts), SCUTTLER_NAME_ERROR)
  Object.defineProperty(vmGlobalThis, opts.scuttlerName, { value: cb })
  scuttle(vmGlobalThis, opts)
  t.is(
    globalRef,
    vmGlobalThis,
    'expect global reference to be the same as provided by the scuttler function'
  )
  const configurablesToThrow = all.filter((p) => configurables.includes(p))
  const configurablesToNotThrow = all.filter((p) => !configurables.includes(p))
  configurablesToThrow.forEach((p) => {
    t.throws(
      () => vmGlobalThis[p],
      { message: err(p) },
      `expected ${p} to throw`
    )
  })
  configurablesToNotThrow.forEach((p) => {
    t.notThrows(() => vmGlobalThis[p], `expected ${p} to not throw`)
  })
})

test('scuttle - resilient', (t) => {
  const vmGlobalThis = getFreshGlobalThis()
  const { all, configurables } = getPropsGroups(vmGlobalThis)
  all.forEach((p) => vmGlobalThis[p])
  scuttle(vmGlobalThis, { enabled: true })
  const configurablesToThrow = all.filter((p) => configurables.includes(p))
  const configurablesToNotThrow = all.filter((p) => !configurables.includes(p))
  const assertScuttled = (): void => {
    configurablesToThrow.forEach((p) => {
      t.throws(
        () => vmGlobalThis[p],
        { message: err(p) },
        `expected ${p} to throw`
      )
    })
    configurablesToNotThrow.forEach((p) => {
      t.notThrows(() => vmGlobalThis[p], `expected ${p} to not throw`)
    })
  }
  assertScuttled()
  t.throws(
    () =>
      Object.defineProperty(vmGlobalThis, 'SharedArrayBuffer', { value: 111 }),
    {
      message: 'Cannot redefine property: SharedArrayBuffer',
    }
  )
  ;(vmGlobalThis as Record<string, unknown>).Array = 1
  assertScuttled()
})

test('scuttle - skip throwing on missing stacktrace', (t) => {
  const CHROME = {}
  const vmGlobalThis = getFreshGlobalThis()
  ;(vmGlobalThis as Record<string, unknown>).chrome = CHROME
  scuttle(vmGlobalThis, { enabled: true })

  const recovery = (Error as unknown as { stackTraceLimit: number })
    .stackTraceLimit
  ;(Error as unknown as { stackTraceLimit: number }).stackTraceLimit = 1

  t.notThrows(() => vmGlobalThis.chrome)
  t.not(vmGlobalThis.chrome, CHROME, 'expect chrome to be replaced by scuttle')
  ;(Error as unknown as { stackTraceLimit: number }).stackTraceLimit = recovery

  t.throws(() => vmGlobalThis.chrome, { message: err('chrome') })
})

test('scuttle - opts as bool false', (t) => {
  t.plan(1)
  const vmGlobalThis = getFreshGlobalThis()
  const { all } = getPropsGroups(vmGlobalThis)
  // scuttle(global, false) is equivalent to { enabled: false }, no-op
  scuttle(vmGlobalThis, false)
  all.forEach((p) => vmGlobalThis[p])
  t.pass('scuttle with false is a no-op')
})
