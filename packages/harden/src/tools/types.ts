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
  packageJson: Record<string, SerializableValue> | null
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
 */
export interface ApplicableOpinion {
  id: string
  description: string
  level: Level
  changes?: Change[]
  recommendCommands?: string[]
  verify?: (facts: Facts) => Promise<number>
  execute?: (
    changes: Change[],
    facts: Facts,
    decisions: Decisions,
    print: PrintApi
  ) => Promise<Change[] | undefined | void>
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
  askToHarden: (opinion: Opinion, facts: Facts) => Promise<boolean | null>
  shouldFollowupCommand: (command: string, facts: Facts) => Promise<boolean>
  shouldStart: (score: Map<string, number[]>) => Promise<boolean>
  showSummary: (summary: string) => Promise<void>
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
