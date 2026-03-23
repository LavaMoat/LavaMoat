/* eslint-disable @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any */
import type { LavaMoatPolicy } from '@lavamoat/types'
import type {
  EndowmentsToolkitFactory,
  LavaMoatScuttleOpts,
} from 'lavamoat-core'
import type { LavaMoatPluginOptions } from '../buildtime/types'

type DebugTools = {
  debugProxy: (target: any, source: object, hint: string) => void
}

type RequiredProperty<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>
export interface RuntimeNamespace {
  scuttling: {
    scuttle: (
      globalThis: Record<string, unknown>,
      scuttleGlobalThis?: LavaMoatScuttleOpts
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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  repairs: Record<string, Function>
  debug: DebugTools | undefined
}
