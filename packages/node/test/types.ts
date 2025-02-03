import type { ExecutionContext } from 'ava'
import type { LavaMoatPolicy } from 'lavamoat-core'
import type { NestedDirectoryJSON } from 'memfs'
import { ExecFileException } from 'node:child_process'
import type { Merge, RequireAtLeastOne, Simplify } from 'type-fest'

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
export type ExecLavamoatNodeExpectationProps = Simplify<
  RequireAtLeastOne<
    Merge<RunCLIOutput, { stdout: string | RegExp; stderr: string | RegExp }>,
    keyof RunCLIOutput
  >
>

/**
 * Output of the `runCLI()` function
 */
export interface RunCLIOutput {
  stdout: string
  stderr: string
  code: ExitCode
}

/**
 * Options for `runCLI()`
 */
export interface RunCLIOptions {
  cwd?: string
  t?: ExecutionContext
}

/**
 * Possible exit code values from calling `child_process.exec`, as defined by
 * Node.js
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
