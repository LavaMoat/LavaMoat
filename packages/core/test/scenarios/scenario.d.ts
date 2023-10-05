// @ts-check

import type { ExecutionContext } from 'ava'
import type { LavaMoatOpts } from '../../../node/src/defaults'
import type { LavaMoatPolicySchema } from '../../schema'

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
  moduleInitializer: (
    exports: Record<string, any>,
    require: (id: string) => any,
    module: Record<string, any>
  ) => void
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
  moduleInitializer?: (
    exports: Record<string, any>,
    require: (id: string) => any,
    module: Record<string, any>
  ) => void
}

export type ScenarioSourceFn = () => void

export interface Scenario<Result = unknown> {
  name?: string
  config?: LavaMoatPolicySchema
  configOverride?: LavaMoatPolicySchema
  expectedFailure?: boolean
  expectedResult?: any
  defineEntry?: ScenarioSourceFn
  defineOne?: ScenarioSourceFn
  defineTwo?: ScenarioSourceFn
  defineThree?: ScenarioSourceFn
  testType?: ScenarioType
  expectedFailureMessageRegex?: RegExp
  files?: Record<string, ScenarioFile>
  defaultPolicy?: boolean
  builtin?: Record<string, any>
  context?: Record<string, any>
  opts?: LavaMoatOpts
  dir?: string
  checkPostRun?: ScenarioCheckPostRunFn<Result>
  checkError?: ScenarioCheckErrorFn<Result>
  checkResult?: ScenarioCheckResultFn<Result>
  kernelArgs?: Record<string, any>
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
    globalThis?: Record<string, any>
    vmContext?: Record<string, any>
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
