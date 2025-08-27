import type { LavaMoatPolicy } from '@lavamoat/types'
import type { ExecutionContext } from 'ava'
import type { LavaMoatScuttleOpts } from 'lavamoat-core'
import type { NestedDirectoryJSON } from 'memfs'
import type { Merge, RequireAtLeastOne, Simplify } from 'type-fest'

import { type ExecFileException } from 'node:child_process'

/**
 * Possible exit code values from calling `child_process.exec`, as defined by
 * Node.js
 *
 * @remarks
 * - I do not know if there's any practical difference between `null` and
 *   `undefined` here.
 * - However, any `string` value must be `parseInt`-able.
 * - I don't know what happens if the exit code is `'256'` or greater. Probably
 *   wraps?
 * - I do not know how to force Node.js' `exec` to throw an error wherein the exit
 *   code is a string.
 * - Speculating: `string` exit codes are accepted as _input_ but are never
 *   _output_ from Node.js' APIs.
 * - Speculating cont'd: likewise for `null`.
 * - An exit code of `undefined` means the same thing as `0` (at least for our
 *   purposes)
 */
export type ExitCode = ExecFileException['code']

/**
 * Data structure representing information about a fixture
 */
export interface Fixture {
  dir: string
  entrypoint: string
  policyOverridePath: string
  policyPath: string
}

/**
 * Options for the function returned by the `fixtureFinder` factory
 */
export interface FixtureOptions {
  /**
   * Entrypoint to use _verbatim_. This is useful when combined with `--bin`
   */
  entrypoint?: string

  /**
   * Filename of the entrypoint which will be computed relative to the fixture
   * dir.
   */
  entrypointFilename?: string

  policyPath?: string

  policyOverridePath?: string
}

/**
 * Options for the `runCLI` function
 */
export type RunCLIOptions = {
  cwd?: string
}

/**
 * Output of the `runCLI` function
 */
export interface RunCLIOutput {
  code: ExitCode
  hrCommand: string
  stderr: string
  stdout: string
}

export interface RunnerWorkerData {
  entryPath: string
  policy: LavaMoatPolicy
  scuttleGlobalThis: LavaMoatScuttleOpts
  vol: NestedDirectoryJSON
}

/**
 * Possible types for the `expected` argument of the `testCLI` macro.
 *
 * Execution output will be automatically trimmed and stripped of ANSI escape
 * codes (colors).
 *
 * If a `string`, it is compared to `stdout`.
 *
 * @template Ctx Test execution context object
 */
export type TestCLIExpectation<Ctx = unknown> =
  | string
  | TestCLIExpectationFn<Ctx>
  | TestCLIExpectationProps

export type TestCLIExpectationFn<Ctx = unknown> = (
  t: ExecutionContext<Ctx>,
  result: {
    code?: ExitCode
    stderr: string
    stdout: string
  }
) => Promise<void> | void

/**
 * Properties to match against the resolved value of the `runCLI` function.
 */
export type TestCLIExpectationProps = Simplify<
  RequireAtLeastOne<
    Merge<RunCLIOutput, { stderr: RegExp | string; stdout: RegExp | string }>,
    keyof RunCLIOutput
  >
>

/**
 * Options for the `testExecForJSON` macro
 */
export interface TestExecForJSONMacroOptions extends TestExecMacroOptions {
  /**
   * Path to entrypoint _within the fixture_. This must be an absolute path or
   * URL.
   *
   * The default is `/index.js`.
   */
  jsonEntrypoint?: string | URL
}

/**
 * Options for the `testExec` macro
 */
export interface TestExecMacroOptions {
  /**
   * Policy to use when executing
   */
  policy?: LavaMoatPolicy
}
