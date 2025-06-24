import type { ExecutionContext } from 'ava'
import type { LavaMoatPolicy } from 'lavamoat-core'
import type { NestedDirectoryJSON } from 'memfs'
import { type ExecFileException } from 'node:child_process'
import type { Merge, RequireAtLeastOne, Simplify } from 'type-fest'
import type { ScuttleGlobalThisOptions } from '../src/types.ts'

export interface RunnerWorkerData {
  entryPath: string
  policy: LavaMoatPolicy
  vol: NestedDirectoryJSON
  scuttleGlobalThis: ScuttleGlobalThisOptions
}

export type TestCLIExpectationFn<Ctx = unknown> = (
  t: ExecutionContext<Ctx>,
  result: {
    stdout: string
    stderr: string
    code?: ExitCode
  }
) => void | Promise<void>

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
  | TestCLIExpectationProps
  | TestCLIExpectationFn<Ctx>

/**
 * Properties to match against the resolved value of the `runCLI` function.
 */
export type TestCLIExpectationProps = Simplify<
  RequireAtLeastOne<
    Merge<RunCLIOutput, { stdout: string | RegExp; stderr: string | RegExp }>,
    keyof RunCLIOutput
  >
>

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
  stdout: string
  stderr: string
  code: ExitCode
  hrCommand: string
}

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
 * Options for the `testExec` macro
 */
export interface TestExecMacroOptions {
  /**
   * Policy to use when executing
   */
  policy?: LavaMoatPolicy
}

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
}

/**
 * Data structure representing information about a fixture
 */
export interface Fixture {
  entrypoint: string
  policyPath: string
  policyOverridePath: string
  dir: string
}
