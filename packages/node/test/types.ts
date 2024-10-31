import type { ExecutionContext } from 'ava'
import type { LavaMoatPolicy } from 'lavamoat-core'
import type { NestedDirectoryJSON } from 'memfs'
import { ExecFileException } from 'node:child_process'
import type { JsonArray, RequireAtLeastOne } from 'type-fest'
import type { ExitCode } from './fixture-util.js'

export interface RunnerWorkerData {
  entryPath: string
  policy: LavaMoatPolicy
  vol: NestedDirectoryJSON
}

export type ExecLavamoatNodeExpectationFn<Ctx = unknown> = (
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
export type ExecLavamoatNodeExpectation<Ctx = unknown> =
  | string
  | ExecLavamoatNodeExpectationProps
  | ExecLavamoatNodeExpectationFn<Ctx>

/**
 * Properties to match against the resolved value of the `runCli` function.
 */
export type ExecLavamoatNodeExpectationProps = RequireAtLeastOne<
  RunCliOutput,
  keyof RunCliOutput
>

/**
 * Output of the `runCli` function
 */
export interface RunCliOutput {
  stdout: string
  stderr: string
  code: ExitCode
}

/**
 * Possible exit code values from calling `child_process.exec`, as defined by
 * Node.js
 */
export type ExitCode = ExecFileException['code']

/**
 * CompactJson is a JSON-compatible type used by `memfs` to create and load
 * virtual FS snapshots.
 *
 * We don't have/need the actual type, but I can tell you that it's an array.
 * And it is JSON-compatible.
 *
 * @see {@link https://jsonjoy.com/specs/compact-json}
 */
export type CompactJSON = JsonArray
