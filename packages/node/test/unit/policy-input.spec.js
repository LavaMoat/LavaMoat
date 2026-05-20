import '../../src/preamble.js'

import test from 'ava'
import { fs, vol } from 'memfs'
import nodePath from 'node:path'
import { ErrorCodes } from '../../src/error-code.js'
import {
  loadPolicy,
  policyInput,
  policyOverrideAuto,
  policyOverrideNone,
  policyOverrideSourceFromFile,
  policyOverrideSourceFromInline,
  policySourceFromDefault,
  policySourceFromFile,
  policySourceFromInline,
  resolvePolicySources,
} from '../../src/policy-input.js'
import { isMergedWrapper, unwrapMerged } from '../../src/policy-util.js'

/**
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {
 *   PolicyOverrideSource,
 *   PolicySource
 * } from '../../src/types.js'
 */

const EMPTY_POLICY = /** @type {LavaMoatPolicy} */ ({ resources: {} })

const OVERRIDE_POLICY = /** @type {LavaMoatPolicy} */ ({
  resources: { foo: { packages: { bar: true } } },
})

test.beforeEach(() => {
  vol.reset()
})

// ---------------------------------------------------------------------------
// policySourceFromFile
// ---------------------------------------------------------------------------

test('policySourceFromFile - creates file source from string path', (t) => {
  const src = policySourceFromFile('/app/policy.json')
  t.is(src.kind, 'file')
  t.is(
    /**
     * @type {Extract<PolicySource, { kind: 'file' }>}
     */ (src).path,
    '/app/policy.json'
  )
})

test('policySourceFromFile - creates file source from URL', (t) => {
  const src = policySourceFromFile(new URL('file:///app/policy.json'))
  t.is(src.kind, 'file')
  t.is(
    /**
     * @type {Extract<PolicySource, { kind: 'file' }>}
     */ (src).path,
    '/app/policy.json'
  )
})

test('policySourceFromFile - result is frozen', (t) => {
  t.true(Object.isFrozen(policySourceFromFile('/app/policy.json')))
})

// ---------------------------------------------------------------------------
// policySourceFromInline
// ---------------------------------------------------------------------------

test('policySourceFromInline - creates inline source from valid policy', (t) => {
  const src = policySourceFromInline(EMPTY_POLICY)
  t.is(src.kind, 'inline')
  t.is(
    /**
     * @type {Extract<PolicySource, { kind: 'inline' }>}
     */ (src).policy,
    EMPTY_POLICY
  )
})

test('policySourceFromInline - throws for invalid policy', (t) => {
  t.throws(() => policySourceFromInline(/** @type {any} */ ({})), {
    code: ErrorCodes.InvalidPolicy,
  })
})

test('policySourceFromInline - result is frozen', (t) => {
  t.true(Object.isFrozen(policySourceFromInline(EMPTY_POLICY)))
})

// ---------------------------------------------------------------------------
// policySourceFromDefault
// ---------------------------------------------------------------------------

test('policySourceFromDefault - creates default source with given projectRoot', (t) => {
  const src = policySourceFromDefault('/my/project')
  t.is(src.kind, 'default')
  t.is(
    /**
     * @type {Extract<PolicySource, { kind: 'default' }>}
     */ (src).projectRoot,
    '/my/project'
  )
})

test('policySourceFromDefault - falls back to process.cwd() when not provided', (t) => {
  const src = policySourceFromDefault()
  t.is(src.kind, 'default')
  t.is(
    /**
     * @type {Extract<PolicySource, { kind: 'default' }>}
     */ (src).projectRoot,
    process.cwd()
  )
})

// ---------------------------------------------------------------------------
// policyOverrideSourceFromFile
// ---------------------------------------------------------------------------

test('policyOverrideSourceFromFile - creates file source from string path', (t) => {
  const src = policyOverrideSourceFromFile('/app/policy-override.json')
  t.is(src.kind, 'file')
  t.is(
    /**
     * @type {Extract<PolicyOverrideSource, { kind: 'file' }>}
     */ (src).path,
    '/app/policy-override.json'
  )
})

test('policyOverrideSourceFromFile - result is frozen', (t) => {
  t.true(Object.isFrozen(policyOverrideSourceFromFile('/p.json')))
})

// ---------------------------------------------------------------------------
// policyOverrideSourceFromInline
// ---------------------------------------------------------------------------

test('policyOverrideSourceFromInline - creates inline source from valid policy', (t) => {
  const src = policyOverrideSourceFromInline(OVERRIDE_POLICY)
  t.is(src.kind, 'inline')
  t.is(
    /**
     * @type {Extract<PolicyOverrideSource, { kind: 'inline' }>}
     */ (src).policy,
    OVERRIDE_POLICY
  )
})

test('policyOverrideSourceFromInline - throws for invalid override', (t) => {
  t.throws(() => policyOverrideSourceFromInline(/** @type {any} */ ({})), {
    code: ErrorCodes.InvalidPolicy,
  })
})

// ---------------------------------------------------------------------------
// policyOverrideAuto / policyOverrideNone
// ---------------------------------------------------------------------------

test('policyOverrideAuto - creates auto source with given projectRoot', (t) => {
  const src = policyOverrideAuto('/my/project')
  t.is(src.kind, 'auto')
  t.is(
    /**
     * @type {Extract<PolicyOverrideSource, { kind: 'auto' }>}
     */ (src).projectRoot,
    '/my/project'
  )
})

test('policyOverrideAuto - falls back to process.cwd() when not provided', (t) => {
  const src = policyOverrideAuto()
  t.is(src.kind, 'auto')
  t.is(
    /**
     * @type {Extract<PolicyOverrideSource, { kind: 'auto' }>}
     */ (src).projectRoot,
    process.cwd()
  )
})

test('policyOverrideNone - creates none source', (t) => {
  const src = policyOverrideNone()
  t.is(src.kind, 'none')
})

test('policyOverrideNone - result is frozen', (t) => {
  t.true(Object.isFrozen(policyOverrideNone()))
})

// ---------------------------------------------------------------------------
// policyInput constructor
// ---------------------------------------------------------------------------

test('policyInput - defaults to file-default primary and auto override', (t) => {
  const input = policyInput({ projectRoot: '/my/project' })
  t.is(input.policy.kind, 'default')
  t.is(
    /**
     * @type {Extract<PolicySource, { kind: 'default' }>}
     */ (input.policy).projectRoot,
    '/my/project'
  )
  t.is(input.override.kind, 'auto')
})

test('policyInput - uses provided primary and override sources', (t) => {
  const primary = policySourceFromFile('/my/policy.json')
  const override = policyOverrideNone()
  const input = policyInput({ policy: primary, override })
  t.is(input.policy, primary)
  t.is(input.override, override)
})

test('policyInput - result is frozen', (t) => {
  t.true(Object.isFrozen(policyInput()))
})

// ---------------------------------------------------------------------------
// resolvePolicySources
// ---------------------------------------------------------------------------

test('resolvePolicySources - file primary resolves to primaryPath', (t) => {
  const input = policyInput({ policy: policySourceFromFile('/p.json') })
  const { policyPath: primaryPath, policy: primaryPolicy } =
    resolvePolicySources(input)
  t.is(primaryPath, '/p.json')
  t.is(primaryPolicy, undefined)
})

test('resolvePolicySources - inline primary resolves to primaryPolicy', (t) => {
  const input = policyInput({ policy: policySourceFromInline(EMPTY_POLICY) })
  const { policyPath: primaryPath, policy: primaryPolicy } =
    resolvePolicySources(input)
  t.is(primaryPath, undefined)
  t.is(primaryPolicy, EMPTY_POLICY)
})

test('resolvePolicySources - default primary resolves to default policy path', (t) => {
  const input = policyInput({
    policy: policySourceFromDefault('/app'),
  })
  const { policyPath: primaryPath } = resolvePolicySources(input)
  t.is(primaryPath, nodePath.join('/app', 'lavamoat/node', 'policy.json'))
})

test('resolvePolicySources - auto override with file primary → sibling path', (t) => {
  const input = policyInput({
    policy: policySourceFromFile('/app/lavamoat/node/policy.json'),
    override: policyOverrideAuto('/app'),
  })
  const { overridePath } = resolvePolicySources(input)
  t.is(
    overridePath,
    nodePath.join('/app/lavamoat/node', 'policy-override.json')
  )
})

test('resolvePolicySources - auto override with inline primary → projectRoot-based path', (t) => {
  const input = policyInput({
    policy: policySourceFromInline(EMPTY_POLICY),
    override: policyOverrideAuto('/app'),
  })
  const { overridePath } = resolvePolicySources(input)
  t.is(
    overridePath,
    nodePath.join('/app', 'lavamoat/node', 'policy-override.json')
  )
})

test('resolvePolicySources - file override → explicit overridePath', (t) => {
  const input = policyInput({
    policy: policySourceFromFile('/p.json'),
    override: policyOverrideSourceFromFile('/o.json'),
  })
  const { overridePath } = resolvePolicySources(input)
  t.is(overridePath, '/o.json')
})

test('resolvePolicySources - inline override → overridePolicy', (t) => {
  const input = policyInput({
    policy: policySourceFromFile('/p.json'),
    override: policyOverrideSourceFromInline(OVERRIDE_POLICY),
  })
  const { overridePath, overridePolicy } = resolvePolicySources(input)
  t.is(overridePath, undefined)
  t.is(overridePolicy, OVERRIDE_POLICY)
})

test('resolvePolicySources - none override → no paths', (t) => {
  const input = policyInput({
    policy: policySourceFromFile('/p.json'),
    override: policyOverrideNone(),
  })
  const { overridePath, overridePolicy } = resolvePolicySources(input)
  t.is(overridePath, undefined)
  t.is(overridePolicy, undefined)
})

// ---------------------------------------------------------------------------
// loadFromInput
// ---------------------------------------------------------------------------

test('loadFromInput - loads from file primary, no override', async (t) => {
  vol.fromJSON({ '/policy.json': JSON.stringify(EMPTY_POLICY) })
  const input = policyInput({
    policy: policySourceFromFile('/policy.json'),
    override: policyOverrideNone(),
  })
  const merged = await loadPolicy(input, {
    readFile: /** @type {any} */ (fs.promises.readFile),
  })
  t.true(isMergedWrapper(merged))
  t.deepEqual(unwrapMerged(merged).resources, {})
})

test('loadFromInput - merges primary and file override', async (t) => {
  vol.fromJSON({
    '/policy.json': JSON.stringify(EMPTY_POLICY),
    '/policy-override.json': JSON.stringify(OVERRIDE_POLICY),
  })
  const input = policyInput({
    policy: policySourceFromFile('/policy.json'),
    override: policyOverrideSourceFromFile('/policy-override.json'),
  })
  const merged = await loadPolicy(input, {
    readFile: /** @type {any} */ (fs.promises.readFile),
  })
  t.deepEqual(unwrapMerged(merged).resources, OVERRIDE_POLICY.resources)
})

test('loadFromInput - uses inline primary policy', async (t) => {
  const input = policyInput({
    policy: policySourceFromInline(EMPTY_POLICY),
    override: policyOverrideNone(),
  })
  const merged = await loadPolicy(input)
  t.deepEqual(unwrapMerged(merged).resources, {})
})

test('loadFromInput - auto override: skips silently when file absent', async (t) => {
  vol.fromJSON({
    '/app/lavamoat/node/policy.json': JSON.stringify(EMPTY_POLICY),
  })
  const input = policyInput({
    policy: policySourceFromFile('/app/lavamoat/node/policy.json'),
    override: policyOverrideAuto('/app'),
  })
  // No override file on disk; should not throw
  const merged = await loadPolicy(input, {
    readFile: /** @type {any} */ (fs.promises.readFile),
  })
  t.deepEqual(unwrapMerged(merged).resources, {})
})

test('loadFromInput - throws NoPolicyError when primary file is missing', async (t) => {
  vol.fromJSON({})
  const input = policyInput({
    policy: policySourceFromFile('/nonexistent.json'),
    override: policyOverrideNone(),
  })
  await t.throwsAsync(
    loadPolicy(input, {
      readFile: /** @type {any} */ (fs.promises.readFile),
    }),
    { code: ErrorCodes.NoPolicy }
  )
})

// ---------------------------------------------------------------------------
// loadPolicy (public wrapper)
// ---------------------------------------------------------------------------

test('loadPolicy - returns a Merged wrapper', async (t) => {
  vol.fromJSON({ '/policy.json': JSON.stringify(EMPTY_POLICY) })
  const merged = await loadPolicy(
    policyInput({
      policy: policySourceFromFile('/policy.json'),
      override: policyOverrideNone(),
    }),
    { readFile: /** @type {any} */ (fs.promises.readFile) }
  )
  t.true(isMergedWrapper(merged))
  t.deepEqual(unwrapMerged(merged).resources, {})
})
