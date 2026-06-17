/**
 * Custom error classes thrown by `@lavamoat/run`.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

/**
 * Enum of error codes thrown by this package.
 */
export const ErrorCodes = Object.freeze(
  /** @type {const} */ ({
    SpecParse: 'LMR_SPEC_PARSE',
    Install: 'LMR_INSTALL',
    NoBinScript: 'LMR_NO_BIN_SCRIPT',
    AmbiguousBinScript: 'LMR_AMBIGUOUS_BIN_SCRIPT',
    UnknownPackage: 'LMR_UNKNOWN_PACKAGE',
  })
)

/**
 * Base class for all errors thrown by `@lavamoat/run`.
 */
export class LavaMoatRunError extends Error {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'LavaMoatRunError'
    /** @type {string} */
    this.code = 'LMR_ERROR'
  }
}

/**
 * Thrown when a package spec cannot be parsed.
 */
export class SpecParseError extends LavaMoatRunError {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'SpecParseError'
    this.code = ErrorCodes.SpecParse
  }
}

/**
 * Thrown when installing a package fails.
 */
export class InstallError extends LavaMoatRunError {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'InstallError'
    this.code = ErrorCodes.Install
  }
}

/**
 * Thrown when a package provides no executable bin script.
 */
export class NoBinScriptError extends LavaMoatRunError {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'NoBinScriptError'
    this.code = ErrorCodes.NoBinScript
  }
}

/**
 * Thrown when a package exposes multiple bin scripts and none was selected.
 */
export class AmbiguousBinScriptError extends LavaMoatRunError {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'AmbiguousBinScriptError'
    this.code = ErrorCodes.AmbiguousBinScript
  }
}

/**
 * Thrown when the installed package name cannot be determined.
 */
export class UnknownPackageError extends LavaMoatRunError {
  /**
   * @param {string} message
   * @param {ErrorOptions} [options]
   */
  constructor(message, options) {
    super(message, options)
    this.name = 'UnknownPackageError'
    this.code = ErrorCodes.UnknownPackage
  }
}
