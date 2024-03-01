import { type LavaMoatPolicy } from 'lavamoat-core'
import { type NestedDirectoryJSON } from 'memfs'
import { type RunOptions } from '../src/types.js'

export type RunnerWorkerOptions = Omit<RunOptions, 'readPowers'>

export interface RunnerWorkerData {
  entryPath: string
  policy: LavaMoatPolicy
  opts?: RunnerWorkerOptions
  vol: NestedDirectoryJSON
}
