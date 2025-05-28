/**
 * @import {ErrorCode, LavaMoatErrorClass, LavaMoatErrorClassParams} from './errors.js'
 * @import {Class} from 'type-fest'
 */
import { ErrorCodes } from './error-code.js'

/**
 * Given a name, code, and implementation, create a new
 * {@link LavaMoatErrorClass}.
 *
 * This handles some boilerplate when creating new custom error classes.
 *
 * @template {ErrorCode} Code
 * @template {ErrorOptions} [Options=ErrorOptions] Default is `ErrorOptions`
 * @param {string} name
 * @param {Code} code
 * @param {Class<Error, LavaMoatErrorClassParams<Options>>} ctor
 * @returns {LavaMoatErrorClass<Code, Options>}
 */
export const createLavaMoatError = (name, code, ctor) => {
  Object.defineProperties(ctor, {
    code: { value: code, enumerable: true },
    name: { value: name },
  })
  Object.defineProperties(ctor.prototype, {
    code: { value: code, enumerable: true },
    name: { value: name },
    [Symbol.toStringTag]: { value: name },
  })

  return /** @type {LavaMoatErrorClass<Code, Options>} */ (
    /** @type {unknown} */ (ctor)
  )
}

/**
 * An error thrown if the attenuator has a problem
 */
export const AttenuationError = createLavaMoatError(
  'AttenuationError',
  ErrorCodes.AttenuationFailure,
  class extends Error {}
)

export const GenerationError = createLavaMoatError(
  'GenerationError',
  ErrorCodes.GenerationFailure,
  class extends Error {}
)

export const ExecutionError = createLavaMoatError(
  'ExecutionError',
  ErrorCodes.ExecutionFailure,
  class extends Error {}
)

export const ConversionError = createLavaMoatError(
  'ConversionError',
  ErrorCodes.ConversionFailure,
  class extends Error {}
)

export const InvalidArgumentsError = createLavaMoatError(
  'InvalidArgumentsError',
  ErrorCodes.InvalidArguments,
  class extends Error {}
)

export const InvalidCompartmentError = createLavaMoatError(
  'InvalidCompartmentError',
  ErrorCodes.InvalidCompartment,
  class extends Error {}
)

export const InvalidPolicyError = createLavaMoatError(
  'InvalidPolicyError',
  ErrorCodes.InvalidPolicy,
  class extends Error {
    /** @type {Readonly<string | undefined>} */
    filepath

    /**
     * @param {string} message
     * @param {Object} options
     * @param {unknown} [options.cause]
     * @param {string} [options.filepath]
     */
    constructor(message, { cause, filepath } = {}) {
      super(message, { cause })
      this.filepath = filepath
    }
  }
)

/**
 * Error thrown if no bin script entrypoint could found
 */
export const NoBinScriptError = createLavaMoatError(
  'NoBinScriptError',
  ErrorCodes.NoBinScript,
  class extends Error {}
)

/**
 * Error thrown if policy cannot be found
 */ export const NoPolicyError = createLavaMoatError(
  'NoPolicyError',
  ErrorCodes.NoPolicy,
  class extends Error {}
)

/**
 * Error thrown if workspace cannot be found
 */
export const NoWorkspaceError = createLavaMoatError(
  'NoWorkspaceError',
  ErrorCodes.NoWorkspace,
  class extends Error {}
)

/**
 * Error thrown if policy denies access to a resource
 */
export const PermissionDeniedError = createLavaMoatError(
  'PermissionDeniedError',
  ErrorCodes.PermissionDenied,
  class extends Error {}
)

/**
 * Error thrown if an policy with an untrusted root is attempted to be run in a
 * trusted context
 */
export const TrustMismatchError = createLavaMoatError(
  'TrustMismatchError',
  ErrorCodes.TrustMismatch,
  class extends Error {}
)
