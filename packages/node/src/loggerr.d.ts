/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="node" />

declare module 'loggerr' {
  /**
   * Builtin formatters
   */
  export type Formatter =
    | 'browser'
    | 'bunyan'
    | 'cli'
    | 'cli-simple'
    | 'default'

  /**
   * This aligns the levels with the streams -- there should be a stream for
   * each level.
   */
  export type TupleOfLength<
    T,
    N extends number,
    A extends any[] = [],
  > = A extends {
    length: N
  }
    ? A
    : TupleOfLength<T, N, [...A, T]>

  /**
   * List of levels when instantiating a new `Loggerr` instance.
   *
   * @remarks
   * You're gonna want at least one level.
   */
  export type Levels = readonly [string, ...string[]]

  export interface LoggerrOptions<T extends Levels = DefaultLevels> {
    formatter?: Formatter | FormatterFunction
    level?: LevelRef<T>
    levels?: T
    streams?: TupleOfLength<NodeJS.WritableStream, T['length']>
  }

  /**
   * Default levels for a new `Loggerr` instance (including the default
   * instance)
   */
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

  /**
   * The type of a formatter, whether {@link Formatters builtin} or not
   */
  export type FormatterFunction = (
    date: Date,
    level: string,
    data: Record<string, any>
  ) => string

  /**
   * Static props of the `Loggerr` class
   */
  interface LoggerrStatic {
    CRITICAL: 2
    DEBUG: 6
    EMERGENCY: 0
    ERROR: 3
    INFO: 5
    WARNING: 4
    defaultOptions: DefaultOptions
    levels: DefaultLevels
    Loggerr: LoggerrConstructor
  }

  type Stderr = NodeJS.Process['stdout']
  type Stdout = NodeJS.Process['stdout']

  type DefaultStreams = readonly [
    Stderr, // emergency
    Stderr, // alert
    Stderr, // critical
    Stderr, // error
    Stderr, // warning
    Stdout, // notice
    Stdout, // info
    Stdout, // debug
  ]

  type DefaultOptions = Readonly<{
    level: LoggerrStatic['WARNING']
    formatter: FormatterFunction
    streams: DefaultStreams
  }>

  /**
   * Get the indices of a tuple; used for referencing a level by number
   */
  export type Indices<T extends { length: number }> = Exclude<
    Partial<T>['length'],
    T['length']
  >

  /**
   * Possible ways to reference a level.
   *
   * If an array, it's the index _or_ the item. If an object, we can only use
   * the key, since the value is arbitrary.
   */
  export type LevelRef<T extends Levels> = T[number] | Indices<T>

  class Loggerr_<const T extends Levels = DefaultLevels> {
    public formatter: FormatterFunction

    public level: Indices<T>

    public streams: TupleOfLength<NodeJS.WritableStream, T['length']>

    public levels: T

    constructor(options?: LoggerrOptions<T>)

    /**
     * All dynamically-created methods are bound to this method with their level
     * for the first argument.
     *
     * @param level Level to log at
     * @param msg Message or error
     * @param extra Extra data
     * @param done "Done" callback
     */
    public log(
      level: LevelRef<T>,
      msg: string | Error,
      extra?: Record<string, any>,
      done?: () => void
    ): void

    /**
     * Sets the log level
     *
     * @param level Level to set
     */
    public setLevel(level: LevelRef<T>): void

    /**
     * Writes to a stream corresponding to the level
     *
     * @param level Level
     * @param msg Message
     * @param done "Done" callback
     */
    public write(
      level: LevelRef<T>,
      msg: Uint8Array | string,
      done?: () => void
    ): void
  }

  /**
   * Each log level gets a method which is one of these.
   */
  export type LogFunction = (
    msg: string | Error,
    extra?: Record<string, unknown>,
    done?: () => void
  ) => void

  /**
   * Defines the dynamic methods added to the {@link Loggerr_ class} instance
   * upon construction
   *
   * @privateRemarks
   * We don't use {@link LevelRef} here because we just want the level names
   */
  export type Loggerr<T extends Levels = DefaultLevels> = {
    [key in T[number]]: LogFunction
  } & Loggerr_<T>

  /**
   * Instantiates a {@link Loggerr}
   *
   * **This** is the type the consumer will interface with when they use the
   * `Loggerr` export (or `Loggerr` prop of the default export).
   */
  interface LoggerrConstructor extends LoggerrStatic {
    new <const T extends Levels = DefaultLevels>(
      options?: LoggerrOptions<T>
    ): Loggerr<T>
  }

  /**
   * Default instance of `Loggerr`, ready to use
   *
   * @remarks
   * The `Loggerr` prop is only present on the default instance.
   */
  const DefaultLoggerr: Loggerr<DefaultLevels> & { Loggerr: typeof Loggerr }

  export const Loggerr: LoggerrConstructor

  export default DefaultLoggerr
}
