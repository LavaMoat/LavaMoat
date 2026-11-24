// @ts-check

import type { LavaMoatPolicy } from '@lavamoat/types'
import type { LavaMoatScuttleOpts } from '../src/scuttle.js'
import type { ExecutionContext } from 'ava'

/** Deep-equal check against {@link Scenario.expect.result}. */
export interface ExpectResult {
  result: unknown
}

/** Truthy check – the entry's stdout-parsed value must be truthy. */
export interface ExpectTruthy {
  truthy: true
}

/** Falsy check – the entry's stdout-parsed value must be falsy. */
export interface ExpectFalsy {
  falsy: true
}

/**
 * Expected error – the runner must throw and the message must match the regex
 * whose source is `error`.
 */
export interface ExpectError {
  error: string
}

/** Union of all expectation shapes stored in `scenario.json`. */
export type ScenarioExpect =
  ExpectResult | ExpectTruthy | ExpectFalsy | ExpectError

/**
 * A test scenario loaded from a committed fixture directory.
 *
 * Consumed by both `packages/core` (via the reference runtime) and
 * `packages/node` (via the `@lavamoat/node` exec pipeline).
 *
 * @example
 *
 * ```ts
 * import { loadScenarios } from 'lavamoat-core/test/scenarios/index.js'
 *
 * for await (const scenario of loadScenarios()) {
 *   console.log(scenario.name, scenario.dir)
 * }
 * ```
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

/**
 * Options passed to a {@link PlatformRunScenario} implementation.
 */
export interface PlatformRunScenarioOpts {
  scenario: Scenario
}

/**
 * Platform-supplied scenario runner function.
 *
 * The core package provides {@link runScenario} as the default implementation.
 * Platforms such as `@lavamoat/node` provide their own that run the scenario
 * through the full platform execution pipeline.
 *
 * @template [Result=unknown] Default is `unknown`
 */
export type PlatformRunScenario<Result = unknown> = (
  opts: PlatformRunScenarioOpts
) => Promise<Result>

/**
 * Function signature used to check a scenario result in AVA.
 *
 * @template [Result=unknown] Default is `unknown`
 */
export type ScenarioCheckFn<Result = unknown> = (
  t: ExecutionContext,
  result: Result | undefined,
  err: Error | undefined,
  scenario: Scenario
) => Promise<void>

/** Async factory that produces a fully-loaded {@link Scenario}. */
export type ScenarioFactory = () => Promise<Scenario>

/**
 * Data passed to the scenario runner Worker thread.
 */
export interface RunnerWorkerData {
  entryPath: string
  policy: LavaMoatPolicy
  setupPath?: string
  scuttleGlobalThis?: LavaMoatScuttleOpts
  globalThisRefs?: string[]
}
