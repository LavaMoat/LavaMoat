import { EndowmentsToolkitFactory, LavaMoatPolicy } from 'lavamoat-core'
import { LavaMoatPluginOptions } from '../plugin'

type DebugTools = {
  debugProxy: (target: any, source: object, hint: string) => void
}

type RequiredProperty<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export interface RuntimeNamespace {
  scuttling: {scuttle: (globalThis: any, scuttleGlobalThis: LavaMoatPluginOptions["scuttleGlobalThis"]) => {}}
  root: string
  idmap: [string, string[]][]
  unenforceable: (string | number)[]
  externals: Record<string | number, string>
  options: LavaMoatPluginOptions
  policy: RequiredProperty<LavaMoatPolicy, 'resources'>
  ENUM: Record<string, string>
  endowmentsToolkit: typeof EndowmentsToolkitFactory
  defaultExport: (...args: any[]) => unknown
  debug: DebugTools | undefined
}
