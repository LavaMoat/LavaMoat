import { LavaMoatPolicy } from 'lavamoat-core'
import type { Volume } from 'memfs'
// {
//   projectRoot,
//   entryId,
//   policyOverride = {},
//   rootPackageName,
//   shouldResolve,
//   includeDebugInfo,
//   ...args
// }
export interface Situation {
  root: string

  name: string
  entryPoint: string
  volume?: Volume
  policy?: LavaMoatPolicy
}
