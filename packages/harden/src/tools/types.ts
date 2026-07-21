import type { PackageJson } from 'type-fest'

export type Level = 'baseline' | 'moderate' | 'paranoid'

export type SerializableObject = { [key: string]: SerializableValue }

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | SerializableObject

export interface Facts {
  cwd: string
  packageJson: PackageJson | null
  packageManagerField: string | null
  hasPackageLock: boolean
  lockfileVersion: number | null
  hasNpmrc: boolean
  hasYarnLock: boolean
  hasYarnrc: boolean
  hasYarnrcYml: boolean
  yarnConfig: Record<string, SerializableValue> | null
  hasYarnState: boolean
  hasPnpmLock: boolean
  hasPnpmWorkspace: boolean
  pnpmWorkspace: Record<string, SerializableValue> | null
  directGitDeps: string[]
}

export type ConfigTarget =
  | '.npmrc'
  | '.yarnrc'
  | '.yarnrc.yml'
  | 'pnpm-workspace.yaml'
export type ChangeTarget = ConfigTarget | 'package.json' | '/lavamoat'

export interface Change {
  target: ChangeTarget
  key: string | string[]
  value: SerializableValue
  comment?: string
  ifNotExist?: boolean
  addToExisting?: boolean
}

export type ChangeResult = Pick<Change, 'key' | 'value'>

export interface AppliedChange extends ChangeResult {
  file: string
}

/**
 * An opinion that can be applied directly (has changes and/or execute, no
 * alternatives).
 *
 * Note: `execute` and `verify` are paired — either both are provided or
 * neither. `execute` performs side effects and `verify` checks the results;
 * neither makes sense without the other.
 */
export type ApplicableOpinion = ApplicableOpinionBase &
  (
    | {
        execute: (
          changes: Change[],
          facts: Facts,
          decisions: Decisions,
          print: PrintApi
        ) => Promise<Change[] | undefined | void>
        verify: (
          changes: Change[],
          results: AppliedChange[],
          facts: Facts
        ) => Promise<boolean>
      }
    | {
        execute?: never
        verify?: never
      }
  )

interface ApplicableOpinionBase {
  id: string
  description: string
  level: Level
  changes?: Change[]
  recommendCommands?: string[]
  alternatives?: never
  detected?: number // ratio of applied changes to total changes, a number between 0 and 1
}

/**
 * An opinion that presents a choice among alternatives; may not have changes or
 * execute.
 */
export interface OpinionWithAlternatives {
  id: string
  description: string
  level: Level
  alternatives: ApplicableOpinion[]
  changes?: never
  execute?: never
  detected?: number // ratio of applied changes to total changes, a number between 0 and 1
}

export type Opinion = ApplicableOpinion | OpinionWithAlternatives

export type PrintApi = (input: unknown) => void

export interface Decisions {
  shouldApplyOpinion: (opinion: Opinion, facts: Facts) => Promise<boolean>
  /**
   * For opinions that offer alternatives, choose which one to apply (or null
   * for none). When absent, opinions with alternatives are skipped.
   */
  chooseOpinion: (
    opinion: OpinionWithAlternatives,
    facts: Facts
  ) => Promise<ApplicableOpinion | null>
  packageManager: () => Promise<string | null>
  askToHarden: (
    opinion: ApplicableOpinion,
    facts: Facts
  ) => Promise<boolean | null>
  shouldFollowupCommand: (command: string, facts: Facts) => Promise<boolean>
  shouldStart: (
    score: Map<string, number[]>,
    opinions: readonly Opinion[],
    facts: Facts
  ) => Promise<boolean>
  showSummary: (summary: string) => Promise<{ exitCode: number }>
}

export interface HardenDefaultsOptions {
  cwd: string
  packageManager?: string
  decisions: Decisions
  print?: PrintApi
}

export interface HardenResult {
  result: AppliedChange[]
  summary: string
}

export type DetectedPM = {
  name: 'npm' | 'yarn' | 'pnpm'
  version: string | null
}

export interface NpmApproveOutput {
  allowScripts: {
    name: string
    changes: { key: string }[]
  }[]
}
