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
  hasPnpmLock: boolean
  hasPnpmWorkspace: boolean
  directGitDeps: string[]
}

export interface Change {
  target: 'config' | 'package.json'
  key: string
  value: SerializableValue
  comment?: string
  ifNotExist?: boolean
}

export type ChangeResult = Pick<Change, 'key' | 'value'>

export interface Opinion {
  description: string
  level?: 'paranoid' | 'moderate' | 'baseline'
  changes?: Change[]
  execute?: (
    changes: Change[],
    facts: Facts,
    askToHarden: (opinion: Opinion, facts: Facts) => Promise<boolean | null>
  ) => Promise<Change[] | undefined | void>
}

export interface Decisions {
  shouldApplyOpinion: (opinion: Opinion, facts: Facts) => Promise<boolean>
  packageManager?: () => Promise<string | null>
  askToHarden?: (opinion: Opinion, facts: Facts) => Promise<boolean | null>
}

export interface AppliedChange {
  file: string
  key: string
  value: SerializableValue
}

export interface HardenResult {
  result: AppliedChange[]
  summary: string
}
