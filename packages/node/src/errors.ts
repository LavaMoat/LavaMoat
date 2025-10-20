/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Class, ValueOf } from 'type-fest'
import type { ErrorCodes } from './error-code.js'

export type ErrorCode = ValueOf<typeof ErrorCodes>

/**
 * A LavaMoat-specific error instance.
 */
export interface LavaMoatError<Code extends ErrorCode, Cause = unknown>
  extends Error {
  /**
   * Underlying cause/error, if any
   */
  readonly cause?: Cause
  /**
   * Unique code for this error. This will be the same value as
   * {@link LavaMoatErrorClass.code}
   *
   * This field exists on the prototype itself and is not an "own" field. It is
   * enumerable.
   */
  readonly code: Code

  readonly message: string
}

/**
 * Constructor parameters for a class implementing {@link LavaMoatErrorClass}
 * (which instantiates a {@link LavaMoatError}).
 *
 * @template Cause Reason for the error; usually another error. Specify if known
 * @template Options Additional options for the error; if this object has any
 *   required fields, the second parameter will be required.
 */
export type LavaMoatErrorClassParams<
  Options extends ErrorOptions = ErrorOptions,
> =
  // tuples seem to struggle with conditional types, so it doesn't look like I can embed it in the tuple
  Partial<Options> extends Options
    ? [message: string, errOptions?: Options]
    : [message: string, errOptions: Options]

/**
 * The _class_ of a {@link LavaMoatError}.
 */
export type LavaMoatErrorClass<
  Code extends ErrorCode,
  Options extends ErrorOptions = ErrorOptions,
> = Class<LavaMoatError<Code, Options>, LavaMoatErrorClassParams<Options>> & {
  /**
   * Unique code for this error. This will be the same value as
   * {@link LavaMoatError.code}
   *
   * This field is enumerable.
   */
  readonly code: Code
}

export type LavaMoatErrorOptions<T> = ErrorOptions & T
