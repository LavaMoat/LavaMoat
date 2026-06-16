export type Level = 'baseline' | 'moderate' | 'paranoid'

type SerializableValue =
  | string
  | number
  | boolean
  | null
  | SerializableValue[]
  | { [key: string]: SerializableValue }

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
  yarnNodeLinker: string | null
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
  description: string
  level?: Level
  changes?: Change[]
  recommendCommands?: string[]
  execute?: (
    changes: Change[],
    facts: Facts,
    decisions: Decisions,
    print: PrintApi
  ) => Promise<Change[] | undefined | void>
  alternatives?: never
}

/**
 * An opinion that presents a choice among alternatives; may not have changes or
 * execute.
 */
export interface OpinionWithAlternatives {
  description: string
  level?: Level
  alternatives: ApplicableOpinion[]
  changes?: never
  execute?: never
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
