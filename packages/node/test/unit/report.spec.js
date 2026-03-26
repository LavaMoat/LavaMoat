import test from 'ava'
import { InvalidArgumentsError } from '../../src/error.js'
import { stripAnsi } from '../../src/format.js'
import {
  createModuleInspectionProgressReporter,
  reportInvalidCanonicalNames,
  reportRedundantPreloads,
  reportSesViolations,
} from '../../src/report.js'

/**
 * @import {WriteStream} from 'node:tty'
 * @import {StructuredViolation} from '../../src/internal.js'
 * @import {Loggerr} from '../../src/log.js'
 * @import {FileUrlString} from '../../src/types.js'
 */

/**
 * Creates a mock log object that captures warning and debug messages
 *
 * @returns {{ log: Loggerr; warnings: string[]; debugs: string[] }}
 */
const createMockLog = () => {
  /** @type {string[]} */
  const warnings = []
  /** @type {string[]} */
  const debugs = []
  return {
    log: /** @type {Loggerr} */ ({
      warning: (/** @type {string} */ msg) => {
        warnings.push(stripAnsi(msg))
      },
      debug: (/** @type {string} */ msg) => {
        debugs.push(stripAnsi(msg))
      },
    }),
    warnings,
    debugs,
  }
}

/**
 * Creates a mock TTY WriteStream for testing progress reporting
 *
 * @param {{ isTTY?: boolean }} [options]
 */
const createMockStream = ({ isTTY = true } = {}) => {
  /** @type {string[]} */
  const writes = []
  return {
    stream: /** @type {WriteStream} */ ({
      isTTY,
      write: (/** @type {string} */ data) => {
        writes.push(data)
      },
    }),
    writes,
  }
}

/**
 * Casts an iterable of strings to a set of `FileUrlString`s
 *
 * Used for {@link createModuleInspectionProgressReporter} tests
 *
 * @param {Iterable<string>} urls
 * @returns {Set<FileUrlString>}
 */
const createInspectionSet = (urls) =>
  /** @type {Set<FileUrlString>} */ (new Set(urls))

/**
 * Creates a minimal `StructuredViolationsResult`
 *
 * @param {object} [overrides]
 * @param {StructuredViolation[]} [overrides.primordialMutations]
 * @param {StructuredViolation[]} [overrides.strictModeViolations]
 * @param {StructuredViolation[]} [overrides.dynamicRequires]
 */
const createViolationsResult = ({
  primordialMutations = [],
  strictModeViolations = [],
  dynamicRequires = [],
} = {}) => ({ primordialMutations, strictModeViolations, dynamicRequires })

// #region reportInvalidCanonicalNames
test('reportInvalidCanonicalNames - no-op when policy is undefined', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
    policy: undefined,
    log,
  })
  t.deepEqual(warnings, [])
})

test('reportInvalidCanonicalNames - no-op when unknownCanonicalNames is empty', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(), new Set(), {
    policy: { resources: {} },
    log,
  })
  t.deepEqual(warnings, [])
})

test('reportInvalidCanonicalNames - throws InvalidArgumentsError for invalid "what"', (t) => {
  const { log } = createMockLog()
  t.throws(
    () =>
      reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
        policy: { resources: { foo: {} } },
        log,
        // @ts-expect-error - invalid type
        what: 'garbage',
      }),
    { instanceOf: InvalidArgumentsError }
  )
})

test('reportInvalidCanonicalNames - resolves direct resource keypath', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
    policy: { resources: { foo: {} } },
    log,
  })
  t.is(warnings.length, 1)
  t.true(warnings[0].includes('resources.foo'))
})

test('reportInvalidCanonicalNames - resolves nested package keypath', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['baz']), new Set(), {
    policy: { resources: { bar: { packages: { baz: true } } } },
    log,
  })
  t.is(warnings.length, 1)
  t.true(warnings[0].includes('resources.bar.packages.baz'))
})

test('reportInvalidCanonicalNames - resolves include array string form keypath', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['qux']), new Set(), {
    policy: { resources: {}, include: ['qux'] },
    log,
  })
  t.is(warnings.length, 1)
  t.true(warnings[0].includes('include.qux'))
})

test('reportInvalidCanonicalNames - resolves include array object form keypath', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['quux']), new Set(), {
    policy: { resources: {}, include: ['quux'] },
    log,
  })
  t.is(warnings.length, 1)
  t.true(warnings[0].includes('include.quux'))
})

test('reportInvalidCanonicalNames - falls back to unknown location description', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['ghost']), new Set(), {
    policy: { resources: {} },
    log,
  })
  t.is(warnings.length, 1)
  t.true(warnings[0].includes('unknown location for "ghost"'))
})

test('reportInvalidCanonicalNames - suggests similar known canonical names', (t) => {
  const { log, warnings, debugs } = createMockLog()
  reportInvalidCanonicalNames(
    new Set(['wrong>baz']),
    new Set(['right>baz', 'other>baz']),
    { policy: { resources: { 'wrong>baz': {} } }, log }
  )
  t.is(warnings.length, 1)
  t.true(debugs.length > 0, 'should log debug messages for suggestions')

  t.true(warnings[0].includes('did you mean'))
  t.true(debugs[0].includes('right>baz'))
})

test('reportInvalidCanonicalNames - maxSuggestions limits suggestion count', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(
    new Set(['wrong>baz']),
    new Set(['a>baz', 'b>baz', 'c>baz']),
    { policy: { resources: { 'wrong>baz': {} } }, log, maxSuggestions: 1 }
  )
  t.is(warnings.length, 1)
  const warning = warnings[0]
  t.true(warning.includes('did you mean'))
  // with only 1 suggestion, " or " should not appear
  t.false(warning.includes(' or '))
})

test('reportInvalidCanonicalNames - singular form for one unknown entry', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
    policy: { resources: { foo: {} } },
    log,
  })
  const warning = warnings[0]
  t.regex(warning, /\bentry\b/)
  t.regex(warning, /\bwas\b/)
  t.notRegex(warning, /\bentries\b/)
})

test('reportInvalidCanonicalNames - plural form for multiple unknown entries', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo', 'bar']), new Set(), {
    policy: { resources: { foo: {}, bar: {} } },
    log,
  })
  const warning = warnings[0]
  t.regex(warning, /\bentries\b/)
  t.regex(warning, /\bwere\b/)
})

test('reportInvalidCanonicalNames - includes policyPath in message', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
    policy: { resources: { foo: {} } },
    log,
    policyPath: 'policy.json',
  })
  const warning = warnings[0]
  t.regex(warning, /policy\.json/)
})

test('reportInvalidCanonicalNames - omits path when policyPath is not provided', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
    policy: { resources: { foo: {} } },
    log,
  })
  const warning = warnings[0]
  t.regex(warning, /found in policy was/)
})

test('reportInvalidCanonicalNames - uses "policy overrides" in message', (t) => {
  const { log, warnings } = createMockLog()
  reportInvalidCanonicalNames(new Set(['foo']), new Set(), {
    policy: { resources: { foo: {} } },
    log,
    what: 'policy overrides',
  })
  const warning = warnings[0]
  t.true(warning.includes('policy overrides'))
})
// #endregion

// #region reportSesViolations
test('reportSesViolations - no-op for empty violations map', (t) => {
  const { log, warnings } = createMockLog()
  reportSesViolations(new Map(), { log })
  t.deepEqual(warnings, [])
})

test('reportSesViolations - reports primordial mutations with summary', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'bad-pkg',
      createViolationsResult({
        primordialMutations: [
          {
            path: './foo.js',
            line: 10,
            column: 5,
            type: 'primordial mutation',
          },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  t.true(
    warnings.some(
      (w) => w.includes('bad-pkg') && w.includes('SES incompatibilities')
    )
  )
  t.true(
    warnings.some(
      (w) =>
        w.includes('primordial mutations') && w.includes('patching is advised')
    )
  )
})

test('reportSesViolations - reports strict mode violations with summary', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'sloppy-pkg',
      createViolationsResult({
        strictModeViolations: [
          {
            path: './bar.js',
            line: 3,
            column: 1,
            type: 'strict-mode violation',
          },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  t.true(
    warnings.some(
      (w) => w.includes('sloppy-pkg') && w.includes('SES incompatibilities')
    )
  )
  t.true(
    warnings.some(
      (w) =>
        w.includes('Strict-mode violations') &&
        w.includes('patching is advised')
    )
  )
})

test('reportSesViolations - reports dynamic require violations with summary', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'dynamic-pkg',
      createViolationsResult({
        dynamicRequires: [
          { path: './dyn.js', line: 7, column: 2, type: 'dynamic requires' },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  t.true(
    warnings.some(
      (w) => w.includes('dynamic-pkg') && w.includes('SES incompatibilities')
    )
  )
  t.true(
    warnings.some(
      (w) =>
        w.includes('Dynamic requires') &&
        w.includes('inhibit policy generation')
    )
  )
})

test('reportSesViolations - all three violation types produce all summaries', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'everything-pkg',
      createViolationsResult({
        primordialMutations: [
          { path: './a.js', line: 1, column: 1, type: 'primordial mutation' },
        ],
        strictModeViolations: [
          {
            path: './b.js',
            line: 2,
            column: 2,
            type: 'strict-mode violation',
          },
        ],
        dynamicRequires: [
          { path: './c.js', line: 3, column: 3, type: 'dynamic requires' },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  // 3 per-package warnings + 2 summary messages = 5
  t.is(warnings.length, 5)
  t.true(
    warnings.some(
      (w) =>
        w.includes('Dynamic requires') &&
        w.includes('inhibit policy generation')
    )
  )
  t.true(warnings.some((w) => w.includes('patching is advised')))
})

test('reportSesViolations - combined strict + primordial summary uses "and"', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'combo-pkg',
      createViolationsResult({
        primordialMutations: [
          { path: './a.js', line: 1, column: 1, type: 'primordial mutation' },
        ],
        strictModeViolations: [
          {
            path: './b.js',
            line: 2,
            column: 2,
            type: 'strict-mode violation',
          },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  t.true(
    warnings.some(
      (w) =>
        w.includes('Strict-mode violations') &&
        w.includes('primordial mutations')
    )
  )
})

test('reportSesViolations - multiple packages each get their own warning', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'pkg-a',
      createViolationsResult({
        primordialMutations: [
          { path: './a.js', line: 1, column: 1, type: 'primordial mutation' },
        ],
      }),
    ],
    [
      'pkg-b',
      createViolationsResult({
        primordialMutations: [
          { path: './b.js', line: 2, column: 2, type: 'primordial mutation' },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  t.true(warnings.some((w) => w.includes('pkg-a')))
  t.true(warnings.some((w) => w.includes('pkg-b')))
})

test('reportSesViolations - violation formatting includes line, column, and type', (t) => {
  const { log, warnings } = createMockLog()
  const violations = new Map([
    [
      'fmt-pkg',
      createViolationsResult({
        dynamicRequires: [
          { path: './fmt.js', line: 42, column: 7, type: 'dynamic requires' },
        ],
      }),
    ],
  ])
  reportSesViolations(violations, { log })
  t.regex(warnings[0], /42:7/)
  t.regex(warnings[0], /\(dynamic requires\)/)
})
// #endregion

// #region createModuleInspectionProgressReporter
test('createModuleInspectionProgressReporter - returns noops for non-TTY stream', (t) => {
  const { stream, writes } = createMockStream({ isTTY: false })
  const { reportModuleInspectionProgress, reportModuleInspectionProgressEnd } =
    createModuleInspectionProgressReporter({ stream })

  t.is(reportModuleInspectionProgress(0, new Set(), new Set()), 0)
  reportModuleInspectionProgressEnd(new Set(), new Set())
  t.deepEqual(writes, [])
})

test('createModuleInspectionProgressReporter - returns noops when disabled', (t) => {
  const { stream, writes } = createMockStream({ isTTY: true })
  const { reportModuleInspectionProgress, reportModuleInspectionProgressEnd } =
    createModuleInspectionProgressReporter({ stream, disabled: true })

  t.is(reportModuleInspectionProgress(0, new Set(), new Set()), 0)
  reportModuleInspectionProgressEnd(new Set(), new Set())
  t.deepEqual(writes, [])
})

test('createModuleInspectionProgressReporter - writes progress on TTY stream', (t) => {
  const { stream, writes } = createMockStream()
  const { reportModuleInspectionProgress } =
    createModuleInspectionProgressReporter({ stream })

  const inspected = createInspectionSet(['file:///a.js'])
  const toInspect = createInspectionSet([
    'file:///a.js',
    'file:///b.js',
    'file:///c.js',
  ])
  const result = reportModuleInspectionProgress(0, inspected, toInspect)

  t.is(result, 1)
  t.is(writes.length, 1)
  const stripped = stripAnsi(writes[0])
  t.regex(stripped, /Inspecting/)
  t.true(stripped.includes('1'))
  t.true(stripped.includes('3'))
})

test('createModuleInspectionProgressReporter - messageCount increments across calls', (t) => {
  const { stream } = createMockStream()
  const { reportModuleInspectionProgress } =
    createModuleInspectionProgressReporter({ stream })

  const inspected = createInspectionSet(['file:///a.js'])
  const toInspect = createInspectionSet(['file:///a.js', 'file:///b.js'])

  let count = 0
  count = reportModuleInspectionProgress(count, inspected, toInspect)
  t.is(count, 1)
  count = reportModuleInspectionProgress(count, inspected, toInspect)
  t.is(count, 2)
  count = reportModuleInspectionProgress(count, inspected, toInspect)
  t.is(count, 3)
})

test('createModuleInspectionProgressReporter - end writes checkmark and count', (t) => {
  const { stream, writes } = createMockStream()
  const { reportModuleInspectionProgressEnd } =
    createModuleInspectionProgressReporter({ stream })

  const inspected = createInspectionSet(['file:///a.js', 'file:///b.js'])
  const toInspect = createInspectionSet(['file:///a.js', 'file:///b.js'])
  reportModuleInspectionProgressEnd(inspected, toInspect)

  t.is(writes.length, 1)
  const stripped = stripAnsi(writes[0])
  t.true(stripped.includes('✓'))
  t.true(stripped.includes('2'))
})

test('createModuleInspectionProgressReporter - pluralizes module count', (t) => {
  const { stream, writes } = createMockStream()
  const { reportModuleInspectionProgress } =
    createModuleInspectionProgressReporter({ stream })

  const oneModule = createInspectionSet(['file:///a.js'])
  reportModuleInspectionProgress(0, oneModule, oneModule)
  let stripped = stripAnsi(writes[0])
  t.regex(stripped, /Inspecting module: /)
  t.notRegex(stripped, /Inspecting modules: /)

  const twoModules = createInspectionSet(['file:///a.js', 'file:///b.js'])
  reportModuleInspectionProgress(0, new Set(), twoModules)
  stripped = stripAnsi(writes[1])
  t.regex(stripped, /Inspecting modules: /)
})
// #endregion

// #region reportRedundantPreloads
test('reportRedundantPreloads - no-op for empty map', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map(), { log })
  t.deepEqual(warnings, [])
})

test('reportRedundantPreloads - simplified format for dot entry', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['my-pkg', ['.']]]), { log })

  t.is(warnings.length, 1)
  const warning = warnings[0]
  t.true(warning.includes('"my-pkg"'))
  t.false(warning.includes('"entry"'))
})

test('reportRedundantPreloads - JSON-like format for non-dot entry', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['my-pkg', ['./lib/index.js']]]), { log })

  t.is(warnings.length, 1)
  const warning = warnings[0]
  t.true(warning.includes('"name": "my-pkg"'))
  t.true(warning.includes('"entry":'))
})

test('reportRedundantPreloads - policyOverridePath takes precedence over policyPath', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['pkg', ['.']]]), {
    log,
    policyOverridePath: 'override.json',
    policyPath: 'policy.json',
  })
  const warning = warnings[0]
  t.regex(warning, /override\.json/)
})

test('reportRedundantPreloads - falls back to policyPath when policyOverridePath is absent', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['pkg', ['.']]]), {
    log,
    policyPath: 'policy.json',
  })
  const warning = warnings[0]
  t.regex(warning, /policy\.json/)
})

test('reportRedundantPreloads - falls back to "the policy" when no paths provided', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['pkg', ['.']]]), { log })
  const warning = warnings[0]
  t.true(warning.includes('the policy'))
})

test('reportRedundantPreloads - lists multiple entries for same canonical name', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['pkg', ['.', './alt.js']]]), { log })

  t.is(warnings.length, 1)
  const warning = warnings[0]
  t.true(warning.includes('"pkg"'))
  t.regex(warning, /alt\.js/)
})

test('reportRedundantPreloads - lists multiple canonical names', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(
    new Map([
      ['pkg-a', ['.']],
      ['pkg-b', ['.']],
    ]),
    { log }
  )

  t.is(warnings.length, 1)
  const warning = warnings[0]
  t.true(warning.includes('"pkg-a"'))
  t.true(warning.includes('"pkg-b"'))
})

test('reportRedundantPreloads - message mentions include', (t) => {
  const { log, warnings } = createMockLog()
  reportRedundantPreloads(new Map([['pkg', ['.']]]), { log })
  const warning = warnings[0]
  t.true(warning.includes('include'))
})
// #endregion
