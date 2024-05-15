import { EndowmentsToolkitFactory, LavaMoatPolicy } from 'lavamoat-core'
import { LavaMoatPluginOptions } from '../plugin'

export interface RuntimeNamespace {
  root: string
  idmap: [string, string[]][]
  unenforceable: string[]
  options: LavaMoatPluginOptions
  policy: LavaMoatPolicy
  ENUM: Record<string, string>
  endowmentsToolkit: typeof EndowmentsToolkitFactory
  defaultExport: (...args: any[]) => unknown
}
