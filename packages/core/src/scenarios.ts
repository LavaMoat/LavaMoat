/**
 * Scenario loader for `@lavamoat/core/scenarios`.
 *
 * Yields {@link Scenario} objects from committed fixture directories under the
 * published `scenarios/` directory. Shared scenarios are platform-agnostic and
 * consumed by `@lavamoat/node` and other platform test suites.
 *
 * @example
 *
 * ```ts
 * import { loadScenarios } from '@lavamoat/core/scenarios'
 *
 * for await (const scenario of loadScenarios()) {
 *   console.log(scenario.name, scenario.dir)
 * }
 * ```
 *
 * @packageDocumentation
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { LavaMoatPolicy } from '@lavamoat/types'
import type { LavaMoatScuttleOpts } from './scuttle.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Deep-equal check against {@link Scenario.expect.result}. */
export interface ExpectResult {
  result: unknown
}

/** Truthy check — the entry's stdout-parsed value must be truthy. */
export interface ExpectTruthy {
  truthy: true
}

/** Falsy check — the entry's stdout-parsed value must be falsy. */
export interface ExpectFalsy {
  falsy: true
}

/**
 * Expected error — the runner must throw and the message must match the regex
 * whose source is `error`.
 */
export interface ExpectError {
  error: string
}

/** Union of all expectation shapes stored in `scenario.json`. */
export type ScenarioExpect = ExpectResult | ExpectTruthy | ExpectFalsy | ExpectError

/**
 * A test scenario loaded from a committed fixture directory.
 *
 * Consumed by both `packages/core` (via the reference runtime) and
 * `packages/node` (via the `@lavamoat/node` exec pipeline).
 */
export interface Scenario {
  /** Human-readable scenario name, used as the AVA test title. */
  name: string

  /**
   * Absolute path to the fixture directory. Set by {@link loadScenarios}; not
   * present in `scenario.json`.
   */
  dir: string

  /**
   * Absolute path to the entry module. Set by {@link loadScenarios} as
   * `path.join(dir, 'entry.js')`.
   */
  entryPath: string

  /**
   * Absolute path to an optional `setup.js` that runs before `lockdown()`. Set
   * by {@link loadScenarios} when `scenario.json.setupPath` is present.
   */
  setupPath?: string

  /**
   * LavaMoat policy for the fixture. Set by {@link loadScenarios} from the
   * fixture's `lavamoat/node/policy.json`; not present in `scenario.json`. A
   * fixture without a policy file gets an empty policy.
   */
  policy: LavaMoatPolicy

  /** Global scuttling options, forwarded to the Worker. */
  scuttleGlobalThis?: LavaMoatScuttleOpts

  /**
   * Custom `globalThis` alias names for the root compartment (rare). Defaults
   * to `['globalThis', 'global']`.
   */
  globalThisRefs?: string[]

  /** Expected outcome of the scenario run. */
  expect: ScenarioExpect
}

/** Raw `scenario.json` content before path resolution. */
interface ScenarioJson {
  $schema?: string
  name: string
  expect: ScenarioExpect
  setupPath?: string
  scuttleGlobalThis?: LavaMoatScuttleOpts
  globalThisRefs?: string[]
}

// ---------------------------------------------------------------------------
// File-system helpers
// ---------------------------------------------------------------------------

/**
 * Path of a fixture's policy file, relative to the fixture directory.
 *
 * This is the default policy location used by `@lavamoat/node`.
 */
const POLICY_PATH = join('lavamoat', 'node', 'policy.json')

/**
 * The `scenarios/` directory shipped with the package.
 *
 * At runtime this file lives in `dist/scenarios.js`, so the scenarios directory
 * is at `../scenarios/` relative to `__dirname`.
 */
const SCENARIOS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'scenarios'
)

/**
 * Read a fixture's policy from its `lavamoat/node/policy.json`.
 *
 * A fixture without a policy file gets the default (empty) policy.
 */
function loadPolicy(fixtureDir: string): LavaMoatPolicy {
  try {
    return JSON.parse(
      readFileSync(join(fixtureDir, POLICY_PATH), 'utf8')
    ) as LavaMoatPolicy
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { resources: {} }
    }
    throw err
  }
}

/**
 * Read a fixture directory and return a populated {@link Scenario} object.
 */
export function loadFixture(fixtureDir: string): Scenario {
  const { $schema: _$schema, ...json } = JSON.parse(
    readFileSync(join(fixtureDir, 'scenario.json'), 'utf8')
  ) as ScenarioJson
  return {
    ...json,
    dir: fixtureDir,
    entryPath: join(fixtureDir, 'entry.js'),
    setupPath: json.setupPath
      ? join(fixtureDir, json.setupPath)
      : undefined,
    policy: loadPolicy(fixtureDir),
  }
}

/**
 * Yield all scenarios from a fixtures sub-tree.
 *
 * Directory layout: `<base>/<group>/<slug>/scenario.json`
 */
function* iterFixtures(base: string): Generator<Scenario> {
  if (!existsSync(base)) return
  for (const groupEnt of readdirSync(base, { withFileTypes: true }).sort(
    (a, b) => (a.name < b.name ? -1 : 1)
  )) {
    if (!groupEnt.isDirectory()) continue
    const groupDir = join(base, groupEnt.name)
    for (const slugEnt of readdirSync(groupDir, { withFileTypes: true }).sort(
      (a, b) => (a.name < b.name ? -1 : 1)
    )) {
      if (!slugEnt.isDirectory()) continue
      const fixtureDir = join(groupDir, slugEnt.name)
      if (!existsSync(join(fixtureDir, 'scenario.json'))) continue
      yield loadFixture(fixtureDir)
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Async generator that yields all shared {@link Scenario} objects from the
 * published `scenarios/` directory.
 *
 * Shared scenarios are platform-agnostic and can be consumed by any LavaMoat
 * platform (e.g. `@lavamoat/node`, browserify, webpack).
 *
 * @example
 *
 * ```ts
 * import { loadScenarios } from '@lavamoat/core/scenarios'
 *
 * for await (const scenario of loadScenarios()) {
 *   test(scenario.name, async (t) => {
 *     const result = await myRunScenario(scenario)
 *     t.deepEqual(result, (scenario.expect as ExpectResult).result)
 *   })
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/require-await
export async function* loadScenarios(): AsyncGenerator<Scenario> {
  for (const scenario of iterFixtures(SCENARIOS_DIR)) {
    yield scenario
  }
}
