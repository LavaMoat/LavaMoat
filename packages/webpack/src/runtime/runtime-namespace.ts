import type { LavaMoatPolicy } from '@lavamoat/types'
import type { EndowmentsToolkitFactory } from 'lavamoat-core'
import type { LavaMoatPluginOptions, ScuttlerConfig } from '../plugin'

type DebugTools = {
  debugProxy: (target: any, source: object, hint: string) => void
}

type RequiredProperty<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export interface RuntimeNamespace {
  scuttling: {
    scuttle: (
      globalThis: Record<string, unknown>,
      scuttleGlobalThis: ScuttlerConfig
    ) => {}
  }
  root: string
  idmap: [string, string[]][]
  ctxm: (string | number)[]
  kch: (string | number)[]
  unenforceable: (string | number)[]
  externals: Record<string | number, string>
  options: LavaMoatPluginOptions
  policy: RequiredProperty<LavaMoatPolicy, 'resources'>
  ENUM: Record<string, string>
  endowmentsToolkit: typeof EndowmentsToolkitFactory
  defaultExport: (...args: any[]) => unknown
  debug: DebugTools | undefined
}
