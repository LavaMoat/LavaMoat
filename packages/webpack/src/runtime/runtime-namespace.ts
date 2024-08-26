import { EndowmentsToolkitFactory, LavaMoatPolicy } from 'lavamoat-core'
import { LavaMoatPluginOptions } from '../plugin'

type RequiredProperty<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export interface RuntimeNamespace {
  root: string
  idmap: [string, string[]][]
  unenforceable: (string | number)[]
  externals: Record<string | number, string>
  options: LavaMoatPluginOptions
  policy: RequiredProperty<LavaMoatPolicy, 'resources'>
  ENUM: Record<string, string>
  endowmentsToolkit: typeof EndowmentsToolkitFactory
  defaultExport: (...args: any[]) => unknown
}
