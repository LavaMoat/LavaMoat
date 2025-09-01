import type { LavaMoatPolicy, LavaMoatScuttleOpts } from 'lavamoat-core'
import type { LockdownOptions } from 'ses'

export type ScuttlerConfig = LavaMoatScuttleOpts | boolean | undefined

export interface CompleteLavaMoatPluginOptions {
  generatePolicy?: boolean
  rootDir?: string
  policyLocation: string
  emitPolicySnapshot?: boolean
  readableResourceIds?: boolean
  HtmlWebpackPluginInterop?: boolean
  inlineLockdown?: RegExp
  diagnosticsVerbosity?: number
  lockdown: LockdownOptions
  policy?: LavaMoatPolicy
  runChecks?: boolean
  isBuiltin: (specifier: string) => boolean
  skipRepairs?: true | string[]
  scuttleGlobalThis?: ScuttlerConfig
  debugRuntime?: boolean
  unlockedChunksUnsafe?: RegExp
  staticShims_experimental?: string[]
}

export type LavaMoatPluginOptions = Partial<CompleteLavaMoatPluginOptions>
