const { warn } = console
const { assign } = Object

const path = require('node:path')

const defaultGetRunModuleStatement = (moduleId) => `__r(${moduleId})`

module.exports = {
  lockdownSerializer: ({ hermesRuntime = false } = {}, originalConfig) => {
    if (originalConfig.getRunModuleStatement) {
      warn(
        'LavaMoat: You are using getRunModuleStatement in serializer config. Lavamoat will attempt to wrap it without breaking it, but if you are doing something unusual, we might affect how it works'
      )
    }

    const config = assign({}, originalConfig)

    // getRunModuleStatement
    let firstCallGetRunModuleStatement = true
    let warningTimer
    const previousGetRunModuleStatement =
      originalConfig.getRunModuleStatement ?? defaultGetRunModuleStatement

    config.getRunModuleStatement = (moduleId) => {
      // assumes react-native InitializeCore is the first thing that gets required.
      const runModuleStatement = previousGetRunModuleStatement(moduleId)
      if (firstCallGetRunModuleStatement) {
        firstCallGetRunModuleStatement = false
        warningTimer = setTimeout(() => {
          warn(
            'LavaMoat: getRunModuleStatement was only called once instead of at least twice, with react-native InitializeCore first and bundle entry second. This is suspicious. Lockdown might not be in effect.'
          )
        }, 50)
        if (moduleId === 0) {
          warn(
            'LavaMoat: getRunModuleStatement was called with moduleId 0 first. That tends to represent the bundle entrypoint but react-native InitializeCore should run first. This is suspicious. Lockdown might not be in effect.'
          )
          return `hardenIntrinsics();__r(${moduleId});`
        }
        return runModuleStatement + ';hardenIntrinsics();'
      }
      clearTimeout(warningTimer)
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
