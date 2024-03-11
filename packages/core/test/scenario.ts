import type { ExecutionContext } from 'ava'
import { ModuleInitializer } from '../src/moduleRecord'
import type { LavaMoatOpts } from '../src/options'
import { LavaMoatPolicy, LavaMoatPolicyOverrides } from '../src/schema'

export type ScenarioType = 'truthy' | 'falsy' | 'deepEqual'

export type ScenarioFileType = 'builtin' | 'js' | 'native'

export type JSFilepath = `${string}.js`

/**
 * Scenario file which is _not_ a `.js` file and has had defaults applied
 */
export interface NormalizedScenarioFile extends ScenarioFile {
  file: string
}

/**
 * Scenario file which is a `.js` file and has had defaults applied
 */
export interface NormalizedScenarioJSFile extends ScenarioFile {
  file: JSFilepath
  specifier: string
  packageName: string
  type: ScenarioFileType
  entry?: true
  importMap: Record<string, string>
}

export interface NormalizedBuiltin extends NormalizedScenarioJSFile {
  specifier: string
  moduleInitializer: ModuleInitializer
}
/**
 * Scenario file as provided by user
 */
export interface ScenarioFile {
  /**
   * File content
   */
  content: string
  /**
   * Filepath
   */
  file?: string
  specifier?: string
  packageName?: string
  type?: ScenarioFileType
  entry?: boolean
  importMap?: Record<string, string>
  moduleInitializer?: ModuleInitializer
}

export type ScenarioSourceFn = () => void

export interface Scenario<Result = unknown> {
  name?: string
  config?: LavaMoatPolicy
  configOverride?: LavaMoatPolicyOverrides
  expectedFailure?: boolean
  expectedResult?: Result
  defineEntry?: ScenarioSourceFn
  defineOne?: ScenarioSourceFn
  defineTwo?: ScenarioSourceFn
  defineThree?: ScenarioSourceFn
  testType?: ScenarioType
  expectedFailureMessageRegex?: RegExp
  files?: Record<string, ScenarioFile>
  defaultPolicy?: boolean
  builtin?: Record<string, unknown>
  context?: Record<string, unknown>
  opts?: LavaMoatOpts
  dir?: string
  checkPostRun?: ScenarioCheckPostRunFn<Result>
  checkError?: ScenarioCheckErrorFn<Result>
  checkResult?: ScenarioCheckResultFn<Result>
  kernelArgs?: Record<string, unknown>
  beforeCreateKernel?: (scenario: NormalizedScenario<Result>) => void
}

export type NormalizedScenario<Result = unknown> = Required<
  Pick<
    Scenario<Result>,
    | 'name'
    | 'checkError'
    | 'checkPostRun'
    | 'checkResult'
    | 'testType'
    | 'builtin'
    | 'expectedResult'
    | 'expectedFailure'
    | 'expectedFailureMessageRegex'
    | 'files'
    | 'config'
    | 'configOverride'
    | 'context'
    | 'opts'
  >
> &
  Pick<Scenario<Result>, 'dir' | 'kernelArgs' | 'beforeCreateKernel'> & {
    entries: string[]
    globalThis?: Record<string, unknown>
    vmContext?: Record<string, unknown>
  }

export type ScenarioCheckPostRunFn<Result = unknown> = (
  t: ExecutionContext,
  result: Result | undefined,
  err: Error | undefined,
  scenario: Scenario<Result>
) => Promise<void>

export type ScenarioCheckResultFn<Result = unknown> = (
  t: ExecutionContext,
  result: Result,
  scenario: Scenario<Result>
) => Promise<void>

export type ScenarioCheckErrorFn<Result = unknown> = (
  t: ExecutionContext,
  err: Error,
  scenario: Scenario<Result>
) => Promise<void>

export type ScenarioFactory = () => Promise<Scenario>
