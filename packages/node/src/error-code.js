/**
 * Provides {@link ErrorCodes} enum
 *
 * @packageDocumentation
 */

/**
 * Enum of error codes thrown by this package
 *
 * Each one of these corresponds to a specific implementation of
 * `LavaMoatError`.
 */
export const ErrorCodes = Object.freeze(
  /** @type {const} */ ({
    AttenuationFailure: 'LMN_ATTENUATION_FAILURE',
    GenerationFailure: 'LMN_GENERATION_FAILURE',
    ExecutionFailure: 'LMN_EXECUTION_FAILURE',
    ConversionFailure: 'LMN_CONVERSION_FAILURE',
    InvalidArguments: 'LMN_INVALID_ARGUMENTS',
    InvalidCompartment: 'LMN_INVALID_COMPARTMENT',
    InvalidPolicy: 'LMN_INVALID_POLICY',
    NoBinScript: 'LMN_NO_BIN_SCRIPT',
    NoPolicy: 'LMN_NO_POLICY',
    NoWorkspace: 'LMN_NO_WORKSPACE',
    PermissionDenied: 'LMN_PERMISSION_DENIED',
    TrustMismatch: 'LMN_TRUST_MISMATCH',
  })
)
