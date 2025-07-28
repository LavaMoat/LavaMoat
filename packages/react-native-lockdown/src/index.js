'use strict'

/**
 * React Native lockdown entry point.
 *
 * @packageDocumentation
 */

/**
 * @import {GetRunModuleStatementFn,
 *  GetPolyfillsFn,
 *  LockedDownSerializerConfig,
 *  LockdownSerializerOptions,
 *  LockdownSerializerConfig} from './lockdown-serializer.js'
 */

const { warn } = console
const { assign } = Object

const path = require('node:path')

/**
 * Default implementation of Metro serializer option 'getRunModuleStatement'.
 *
 * @type {GetRunModuleStatementFn}
 */
const defaultGetRunModuleStatement = (moduleId) => `__r(${moduleId})`

const ENTRY_FILE_MODULE_ID = 0

/**
 * Creates a function to inspect for anomalies during module loading, then warns
 * when complete.
 *
 * @returns {(callLog: (number | string)[]) => void} Function to inspect the
 *   call log
 */
const warnAboutAnomalies = () => {
  /**
   * @type {{
   *   calledOnceOnly: string | false
   *   neverCalledWithEntryModule: string | false
   * }}
   */
  const deferredWarnings = {
    calledOnceOnly:
      'LavaMoat: getRunModuleStatement was only called once instead of at least twice in quick succession, with react-native InitializeCore first and bundle entry second. This is suspicious. Lockdown might not be in effect.',
    neverCalledWithEntryModule:
      'LavaMoat: getRunModuleStatement was not called with moduleId 0. Lockdown was not applied.',
  }

  // Emit warnings only after Metro finishes bundling
  process.on('exit', () => {
    Object.values(deferredWarnings).forEach((message) => {
      if (message) warn(message)
    })
  })

  /**
   * Inspects the call log for anomalies.
   *
   * @param {(number | string)[]} callLog - Array of module IDs that were loaded
   * @returns {void}
   */
  return function inspectCallLog(callLog) {
    if (callLog.length > 1) {
      deferredWarnings.calledOnceOnly = false
    }

    if (callLog.includes(ENTRY_FILE_MODULE_ID)) {
      deferredWarnings.neverCalledWithEntryModule = false
    }

    if (callLog[0] === ENTRY_FILE_MODULE_ID) {
      warn(
        'LavaMoat: getRunModuleStatement was called with moduleId 0 first. That should represent the bundle entrypoint but react-native InitializeCore should run first. This is suspicious. Lockdown might not be in effect or might be breaking react-native core polyfills.'
      )
    }

    // Note: Metro loads React Native InitializeCore first, then the React Native app entry file index.js (moduleId: 0).
    // - React Native CLI calls Metro to bundle, which tends to call this sequence twice
    // - After bunding, React Native in Dev mode tends to call this sequence per hot-reload
    // - We warn rather than error on multiple calls, since this is expected behaviour
    if (new Set(callLog).size !== callLog.length) {
      warn(
        `LavaMoat: getRunModuleStatement was called with the same moduleId multiple times. It might be because some build is running twice with the same config instance. [${callLog.join(', ')}]`
      )
    }
  }
}

/**
 * Creates a Metro serializer configuration with Hardened JavaScript.
 *
 * @param {LockdownSerializerOptions} [options={}] - Configuration options.
 *   Default is `{}`
 * @param {LockdownSerializerConfig} [userConfig={}] - User-provided serializer
 *   configuration. Default is `{}`
 * @returns {LockedDownSerializerConfig} Serializer configuration with Hardened
 *   JavaScript.
 */
const lockdownSerializer = ({ hermesRuntime = true } = {}, userConfig = {}) => {
  if (userConfig.getRunModuleStatement) {
    warn(
      'LavaMoat: You are using getRunModuleStatement in your serializer config. Lavamoat will attempt to wrap it without breaking it, but if you are doing something unusual, it may be affected.'
    )
  }

  /** @type {LockedDownSerializerConfig} */
  const config = /** @type {any} */ (assign({}, userConfig))

  /** @type {(number | string)[]} */
  const callLog = []

  /** @type {GetRunModuleStatementFn} */
  const previousGetRunModuleStatement =
    userConfig.getRunModuleStatement ?? defaultGetRunModuleStatement

  const inspectCallLog = warnAboutAnomalies()

  /** @type {GetRunModuleStatementFn} */
  config.getRunModuleStatement = (moduleId) => {
    callLog.push(moduleId)
    inspectCallLog(callLog)
    const runModuleStatement = previousGetRunModuleStatement(moduleId)

    if (moduleId === ENTRY_FILE_MODULE_ID) {
      return `hardenIntrinsics();${runModuleStatement}`
    }

    return runModuleStatement
  }

  if (!config.getPolyfills) {
    config.getPolyfills = /** @type {GetPolyfillsFn} */ (
      // @ts-expect-error no typedefs
      require('@react-native/js-polyfills')
    )
  } else if (typeof config.getPolyfills !== 'function') {
    throw Error('Invalid options: getPolyfills must be a function')
  }

  const originalGetPolyfills = config.getPolyfills

  /** @type {GetPolyfillsFn} */
  config.getPolyfills = (options) => {
    let polyfills = originalGetPolyfills(options)
    assertPolyfills(polyfills)

    const ses = hermesRuntime
      ? require.resolve('ses/hermes')
      : require.resolve('ses')
    const repair = require.resolve('./repair.js')

    return [ses, repair, ...polyfills]
  }

  return config
}

/**
 * Asserts the alleged polyfills are valid for serialization by Metro.
 *
 * @param {unknown} polyfills - Array of polyfill paths
 * @returns {asserts polyfills is ReadonlyArray<string>}
 * @throws {TypeError} If required polyfills are invalid
 */
const assertPolyfills = (polyfills) => {
  if (!Array.isArray(polyfills)) {
    throw TypeError(
      `Expected polyfills to be an array of strings, but received: ${typeof polyfills}`
    )
  }

  for (const polyfill of polyfills) {
    if (typeof polyfill === 'function') {
      throw TypeError(
        `Expected polyfill to be a string, but received a ${typeof polyfill}. ` +
          "Looks like you're passing @react-native/js-polyfills, but not calling the function they export. " +
          "Yes, it's not very intuitive, but it is what it is."
      )
    }

    if (typeof polyfill !== 'string') {
      throw TypeError(
        `Expected polyfill to be a string, but received: ${typeof polyfill}`
      )
    }

    if (!path.isAbsolute(polyfill) && !polyfill.startsWith('.')) {
      throw TypeError(
        `Expected polyfill to be a resolved path, not just a package name: ${polyfill}`
      )
    }
  }
}

module.exports = {
  lockdownSerializer,
  assertPolyfills,
}
