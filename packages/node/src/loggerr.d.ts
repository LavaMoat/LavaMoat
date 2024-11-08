// TODO: remove this file when https://github.com/wesleytodd/loggerr/pull/19
// published

/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'loggerr' {
  export type Formatter =
    | 'browser'
    | 'bunyan'
    | 'cli'
    | 'cli-simple'
    | 'default'

  export interface LoggerrOptions<T extends readonly string[] = DefaultLevels> {
    formatter?: Formatter | FormatterFunction
    level?: string | number
    levels?: T
    streams?: NodeJS.WritableStream[]
  }

  export type DefaultLevels = readonly [
    'emergency',
    'alert',
    'critical',
    'error',
    'warning',
    'notice',
    'info',
    'debug',
  ]

  export type FormatterFunction = (
    date: Date,
    level: string,
    data: Record<string, any>
  ) => string

  interface LoggerrStatic {
    CRITICAL: 2
    DEBUG: 6
    EMERGENCY: 0
    ERROR: 3
    INFO: 5
    WARNING: 4
    defaultOptions: DefaultOptions
    levels: [
      'emergency',
      'alert',
      'critical',
      'error',
      'warning',
      'notice',
      'info',
      'debug',
    ]
    Loggerr: LoggerrConstructor
  }

  type DefaultOptions = {
    level: LoggerrStatic['WARNING']
    formatter: FormatterFunction
    streams: [
      NodeJS.Process['stderr'], // emergency
      NodeJS.Process['stderr'], // alert
      NodeJS.Process['stderr'], // critical
      NodeJS.Process['stderr'], // error
      NodeJS.Process['stderr'], // warning
      NodeJS.Process['stdout'], // notice
      NodeJS.Process['stdout'], // info
      NodeJS.Process['stdout'], // debug
    ]
  }

  class _Loggerr<const T extends readonly string[] = DefaultLevels> {
    public formatter: FormatterFunction
    public level: number
    public streams: NodeJS.WritableStream[]

    public levels: T

    constructor(options?: LoggerrOptions<T>)

    public log(
      level: keyof T | T[number],
      msg: any,
      extra?: Record<string, any>,
      done?: () => void
    ): void

    public setLevel(level: keyof T | T[number]): void

    public write(
      level: keyof T | T[number],
      msg: string,
      done?: () => void
    ): void
  }

  export type LogFunction = (
    msg: any,
    extra?: Record<string, any>,
    done?: () => void
  ) => void

  export type Loggerr<T extends readonly string[] = DefaultLevels> = {
    [key in T[number]]: LogFunction
  } & _Loggerr<T>

  interface LoggerrConstructor extends LoggerrStatic {
    new <const T extends readonly string[] = DefaultLevels>(
      options?: LoggerrOptions<T>
    ): Loggerr<T>
  }

  /**
   * The `Loggerr` prop is only present on the default instance.
   */
  const DefaultLoggerr: Loggerr<DefaultLevels> & { Loggerr: typeof Loggerr }

  export const Loggerr: LoggerrConstructor

  export default DefaultLoggerr
}
