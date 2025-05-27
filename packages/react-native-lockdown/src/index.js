const { warn } = console
const { assign } = Object

const path = require('node:path')

const defaultGetRunModuleStatement = (moduleId) => `__r(${moduleId})`

const ENTRY_FILE_MODULE_ID = 0

const warnAboutAnomalies = () => {
  const deferredWarnings = {
    calledOnceOnly:
      'LavaMoat: getRunModuleStatement was only called once instead of at least twice in quick succession, with react-native InitializeCore first and bundle entry second. This is suspicious. Lockdown might not be in effect.',
    neverCalledWithEntryModule:
      'LavaMoat: getRunModuleStatement was not called with moduleId 0. Lockdown was not applied.',
  }
  // This is to ensure that we warn about anomalies after all work is done
  process.on('exit', () => {
    Object.values(deferredWarnings).forEach((message) => {
      if (message) warn(message)
    })
  })

  return function inspectCallLog(callLog) {
    if (callLog.length > 1) {
      deferredWarnings['calledOnceOnly'] = false
    }
    if (callLog.includes(ENTRY_FILE_MODULE_ID)) {
      deferredWarnings['neverCalledWithEntryModule'] = false
    }

    if (callLog[0] === ENTRY_FILE_MODULE_ID) {
      warn(
        'LavaMoat: getRunModuleStatement was called with moduleId 0 first. That should represent the bundle entrypoint but react-native InitializeCore should run first. This is suspicious. Lockdown might not be in effect or might be breaking react-native core polyfills.'
      )
    }

    if (new Set(callLog).size !== callLog.length) {
      warn(
        `LavaMoat: getRunModuleStatement was called with the same moduleId multiple times. It might be because some build is running twice with the same config instance. [${callLog.join(', ')}]`
      )
    }
  }
}

module.exports = {
  lockdownSerializer: ({ hermesRuntime = false } = {}, originalConfig) => {
    if (originalConfig.getRunModuleStatement) {
      warn(
        'LavaMoat: You are using getRunModuleStatement in serializer config. Lavamoat will attempt to wrap it without breaking it, but if you are doing something unusual, we might affect how it works.'
      )
    }

    const config = assign({}, originalConfig)

    const callLog = []

    const previousGetRunModuleStatement =
      originalConfig.getRunModuleStatement ?? defaultGetRunModuleStatement

    const inspectCallLog = warnAboutAnomalies()

    config.getRunModuleStatement = (moduleId) => {
      callLog.push(moduleId)
      inspectCallLog(callLog)
      // assumes react-native InitializeCore is the first thing that gets required.
      const runModuleStatement = previousGetRunModuleStatement(moduleId)

      if (moduleId === ENTRY_FILE_MODULE_ID) {
        return `hardenIntrinsics();${runModuleStatement}`
      }

      return runModuleStatement
    }

    // Default RN JS polyfills
    if (!config.getPolyfills) {
      config.getPolyfills = require('@react-native/js-polyfills')
    } else if (typeof config.getPolyfills !== 'function') {
      throw new Error('serializer.getPolyfills must be a function')
    }

    // SES
    const ses = hermesRuntime
      ? require.resolve('ses/hermes')
      : require.resolve('ses')
    const repair = require.resolve('./repair.js')

    // getRunModuleStatement
    const originalPolyfills = config.getPolyfills
    config.getPolyfills = () => {
      const polyfills = originalPolyfills()
      // polyfills = polyfills.flat() // if user forgets to spread an array from e.g. RN js polyfills
      module.exports.validatePolyfills(polyfills)
      return [ses, repair, ...polyfills]
    }
    return config
  },
  validatePolyfills: function validatePolyfills(polyfills) {
    for (const polyfill of polyfills) {
      if (!Array.isArray(polyfills)) {
        throw new Error(
          `Expected polyfills to be an array of strings, but received ${typeof polyfills}`
        )
      }
      if (typeof polyfill !== 'string') {
        if (typeof polyfill === 'function') {
          throw new Error(
            `Expected polyfills to be an array of strings, but found a function. Looks like you're passing react-native/js-polyfills but not calling the function they export. Yes, it's not very intuitive, but it is what it is.`
          )
        }
        throw new Error(
          `Expected polyfills to be an array of strings, but received ${typeof polyfill}`
        )
      } else {
        // make sure the polyfill is a resolved path not just a package name
        if (!path.isAbsolute(polyfill) && !polyfill.startsWith('.')) {
          throw new Error(
            `Polyfill must be a resolved path, not just a package name: ${polyfill}`
          )
        }
      }
    }
  },
}
