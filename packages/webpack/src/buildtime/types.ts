import type { LavaMoatPolicy } from '@lavamoat/types'
import type { LavaMoatScuttleOpts } from 'lavamoat-core'
import type { LockdownOptions } from 'ses'
import type { Chunk } from 'webpack'
export interface LavaMoatChunkRuntimeConfiguration {
  mode: 'safe' | 'unlocked_unsafe'
  staticShims?: string[],
  embeddedOptions?: Partial<Pick<CompleteLavaMoatPluginOptions, 'lockdown' | 'scuttleGlobalThis'>>
}

export type ScuttlerConfig = LavaMoatScuttleOpts | boolean | undefined

export interface CompleteLavaMoatPluginOptions {
  generatePolicy?: boolean
  generatePolicyOnly?: boolean
  rootDir?: string
  policyLocation: string
  emitPolicySnapshot?: boolean
  readableResourceIds?: boolean
  HtmlWebpackPluginInterop?: boolean
  inlineLockdown?: RegExp
  diagnosticsVerbosity: number
  lockdown: LockdownOptions
  policy?: LavaMoatPolicy
  runChecks?: boolean
  isBuiltin: (specifier: string) => boolean
  skipRepairs?: true | string[]
  scuttleGlobalThis?: ScuttlerConfig
  debugRuntime?: boolean
  unlockedChunksUnsafe?: RegExp
  staticShims_experimental?: string[]
  runtimeConfigurationPerChunk_experimental?: (chunk: Chunk) => LavaMoatChunkRuntimeConfiguration
}

export type LavaMoatPluginOptions = Partial<CompleteLavaMoatPluginOptions>
