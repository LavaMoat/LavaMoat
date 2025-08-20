import type { LavaMoatPolicy } from '@lavamoat/types'
import type { LavaMoatScuttleOpts } from 'lavamoat-core'
import type { LockdownOptions } from 'ses'
import type { Chunk } from 'webpack'
export interface LavaMoatChunkRuntimeConfiguration {
  mode: 'safe' | 'unlocked_unsafe' | 'null_unsafe'
  staticShims?: string[],
  embeddedOptions?: Partial<Pick<CompleteLavaMoatPluginOptions, 'lockdown' | 'scuttleGlobalThis'>>
}

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
  scuttleGlobalThis?: LavaMoatScuttleOpts
  debugRuntime?: boolean
  unlockedChunksUnsafe?: RegExp
  staticShims_experimental?: string[]
  runtimeConfigurationPerChunk_experimental?: (chunk: Chunk) => LavaMoatChunkRuntimeConfiguration
  isolateLocations?: Record<string, string>
}

export type LavaMoatPluginOptions = Partial<CompleteLavaMoatPluginOptions>
