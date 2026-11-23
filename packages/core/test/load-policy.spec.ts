import test from 'ava'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// dist/ import because load-policy has cross-module imports with .js extensions
// (required for tsc), which Node.js native type stripping can't resolve.
// `pretest` ensures dist/ is fresh before specs run.
import {
  loadPolicy,
  loadPoliciesSync,
  loadPolicyAndApplyOverrides,
} from '../dist/load-policy.js'
import type { LavaMoatPolicy } from '@lavamoat/types'

/** Create a temp dir and return its path, registered for cleanup after test. */
function makeTempDir(t: { teardown: (fn: () => void) => void }): string {
  const dir = mkdtempSync(join(tmpdir(), 'lavamoat-core-test-'))
  t.teardown(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

function writePolicyFile(dir: string, name: string, policy: LavaMoatPolicy): string {
  const p = join(dir, name)
  writeFileSync(p, JSON.stringify(policy))
  return p
}

// loadPolicy

test('loadPolicy - returns empty policy if file not found', async (t) => {
  const result = await loadPolicy({
    debugMode: false,
    policyPath: '/nonexistent/does-not-exist.json',
  })
  t.deepEqual(result, { resources: {} })
})

test('loadPolicy - reads and parses policy from disk', async (t) => {
  const dir = makeTempDir(t)
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { x: true } } } }
  const policyPath = writePolicyFile(dir, 'policy.json', policy)
  const result = await loadPolicy({ debugMode: false, policyPath })
  t.deepEqual(result, policy)
})

test('loadPolicy - throws on invalid JSON', async (t) => {
  const dir = makeTempDir(t)
  const policyPath = join(dir, 'policy.json')
  writeFileSync(policyPath, 'NOT JSON')
  await t.throwsAsync(() => loadPolicy({ debugMode: false, policyPath }), {
    message: /could not parse policy/,
  })
})

// loadPolicyAndApplyOverrides

test('loadPolicyAndApplyOverrides - returns policy if no override file', async (t) => {
  const dir = makeTempDir(t)
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { x: true } } } }
  const policyPath = writePolicyFile(dir, 'policy.json', policy)
  const result = await loadPolicyAndApplyOverrides({
    debugMode: false,
    policyPath,
    policyOverridePath: join(dir, 'policy-override.json'),
  })
  t.deepEqual(result, policy)
})

test('loadPolicyAndApplyOverrides - merges override into policy', async (t) => {
  const dir = makeTempDir(t)
  const policy: LavaMoatPolicy = { resources: { foo: { globals: { x: true } } } }
  const override: LavaMoatPolicy = { resources: { foo: { globals: { y: true } } } }
  const policyPath = writePolicyFile(dir, 'policy.json', policy)
  const policyOverridePath = writePolicyFile(dir, 'policy-override.json', override)
  const result = await loadPolicyAndApplyOverrides({
    debugMode: false,
    policyPath,
    policyOverridePath,
  })
  t.deepEqual(result, {
    resources: { foo: { globals: { x: true, y: true } } },
  })
})

test('loadPolicyAndApplyOverrides - warns when new override resources detected', async (t) => {
  const dir = makeTempDir(t)
  const policy: LavaMoatPolicy = { resources: { existing: {} } }
  const override: LavaMoatPolicy = { resources: { newPkg: { globals: { z: true } } } }
  const policyPath = writePolicyFile(dir, 'policy.json', policy)
  const policyOverridePath = writePolicyFile(dir, 'policy-override.json', override)

  const warnings: string[] = []
  const origWarn = console.warn
  console.warn = (...args: unknown[]) => { warnings.push(String(args[0])) }
  t.teardown(() => { console.warn = origWarn })

  await loadPolicyAndApplyOverrides({ debugMode: false, policyPath, policyOverridePath })

  t.true(
    warnings.some((w) => w.includes('new policy override')),
    'should warn about new override resources'
  )
})

// loadPoliciesSync

test('loadPoliciesSync - policy is undefined if file not found', (t) => {
  const dir = makeTempDir(t)
  const { policy } = loadPoliciesSync({
    debugMode: false,
    policyPath: join(dir, 'missing.json'),
    policyOverridePath: join(dir, 'missing-override.json'),
  })
  t.is(policy, undefined)
})

test('loadPoliciesSync - applyOverride returns main when no override file', (t) => {
  const dir = makeTempDir(t)
  const main: LavaMoatPolicy = { resources: { a: {} } }
  const { applyOverride } = loadPoliciesSync({
    debugMode: false,
    policyPath: join(dir, 'missing.json'),
    policyOverridePath: join(dir, 'missing-override.json'),
  })
  t.is(applyOverride(main), main)
})

test('loadPoliciesSync - applyOverride merges override', (t) => {
  const dir = makeTempDir(t)
  const override: LavaMoatPolicy = { resources: { b: { globals: { y: true } } } }
  const overridePath = writePolicyFile(dir, 'policy-override.json', override)
  const { applyOverride } = loadPoliciesSync({
    debugMode: false,
    policyPath: join(dir, 'missing.json'),
    policyOverridePath: overridePath,
  })
  const main: LavaMoatPolicy = { resources: { a: { globals: { x: true } } } }
  const result = applyOverride(main)
  t.deepEqual(result, {
    resources: {
      a: { globals: { x: true } },
      b: { globals: { y: true } },
    },
  })
})
