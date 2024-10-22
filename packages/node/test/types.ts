import { type LavaMoatPolicy } from 'lavamoat-core'
import { type NestedDirectoryJSON } from 'memfs'

export interface RunnerWorkerData {
  entryPath: string
  policy: LavaMoatPolicy
  vol: NestedDirectoryJSON
}
