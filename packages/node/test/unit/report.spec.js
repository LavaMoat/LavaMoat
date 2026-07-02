import '../../src/preamble.js'

import test from 'ava'
import {
  createModuleInspectionProgressReporter,
  reportInvalidCanonicalNames,
  reportSesViolations,
} from '../../src/report.js'
import { noop } from '../../src/util.js'

/**
 * @import {Loggerr} from '../../src/log.js'
 */

test('reportSesViolations - should not log if no violations were found', (t) => {
  let logged = false
  const log = /** @type {Loggerr} */ (
    /** @type {unknown} */ ({
      warning: () => {
        logged = true
      },
    })
  )
  reportSesViolations(new Map(), {
    log,
  })
  t.false(logged)
})

test('reportSesViolations - should log if violations were found', (t) => {
  let logged = false
  const log = /** @type {Loggerr} */ (
    /** @type {unknown} */ ({
      warning: () => {
        logged = true
      },
    })
  )
  reportSesViolations(
    new Map([
      [
        'a',
        {
          primordialMutations: [
            {
              path: 'file:///some/path',
              line: 1,
              column: 1,
              type: 'primordialMutation',
            },
          ],
          strictModeViolations: [],
          dynamicRequires: [],
        },
      ],
    ]),
    {
      log,
    }
  )
  t.true(logged)
})

test('createModuleInspectionProgressReporter - when disabled, functions do nothing', (t) => {
  t.plan(2)
  const reporter = createModuleInspectionProgressReporter({
    disabled: true,
  })
  t.is(reporter.reportModuleInspectionProgress, noop)
  t.is(reporter.reportModuleInspectionProgressEnd, noop)
})

test('reportInvalidCanonicalNames - should not log if no invalid canonical names were found', (t) => {
  let logged = false
  const log = /** @type {Loggerr} */ (
    /** @type {unknown} */ ({
      warning: () => {
        logged = true
      },
    })
  )
  reportInvalidCanonicalNames(new Set(), new Set(), {
    log,
    policy: { resources: {} },
  })
  t.false(logged)
})

test('reportInvalidCanonicalNames - should not log if no policy was provided', (t) => {
  let logged = false
  const log = /** @type {Loggerr} */ (
    /** @type {unknown} */ ({
      warning: () => {
        logged = true
      },
    })
  )
  reportInvalidCanonicalNames(new Set(), new Set(), {
    log,
  })
  t.false(logged)
})

test('reportInvalidCanonicalNames - should throw if invalid "what" was provided', (t) => {
  t.throws(() => {
    reportInvalidCanonicalNames(new Set(['a']), new Set(['b']), {
      policy: { resources: { a: {}, b: {} } },
      // @ts-expect-error - purposely invalid type
      what: 'invalid',
    })
  })
})

test('reportInvalidCanonicalNames - should log if invalid canonical names were found', (t) => {
  let logged = false
  const log = /** @type {Loggerr} */ (
    /** @type {unknown} */ ({
      warning: () => {
        logged = true
      },
    })
  )
  reportInvalidCanonicalNames(new Set(['a']), new Set(['b']), {
    log,
    policy: { resources: { a: {}, b: {} } },
  })
  t.true(logged)
})
