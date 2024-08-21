import { EndowmentsToolkitFactory, LavaMoatPolicy } from 'lavamoat-core'
import { LavaMoatPluginOptions } from '../plugin'

type RequiredProperty<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export interface RuntimeNamespace {
  scuttle: {scuttle: <T, U>(arg1: T, arg2: U) => {}}
  root: string
  idmap: [string, string[]][]
  unenforceable: string[]
  options: LavaMoatPluginOptions
  policy: RequiredProperty<LavaMoatPolicy, 'resources'>
  ENUM: Record<string, string>
  endowmentsToolkit: typeof EndowmentsToolkitFactory
  defaultExport: (...args: any[]) => unknown
}
