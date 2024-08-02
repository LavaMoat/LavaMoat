import type { LavaMoatPolicy } from '@lavamoat/types'
import type { LockdownOptions } from 'ses'

export interface ScuttlerObjectConfig {
  enabled?: boolean
  exceptions?: string[]
  scuttlerName?: string
}

export type ScuttlerConfig = ScuttlerObjectConfig | boolean | undefined

export interface LavaMoatPluginOptions {
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
  scuttleGlobalThis?: ScuttlerConfig
  debugRuntime?: boolean
  unlockedChunksUnsafe?: RegExp
}
