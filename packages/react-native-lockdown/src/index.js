const { warn } = console
const { assign } = Object

const defaultGetRunModuleStatement = (moduleId) => `__r(${moduleId})`

const validatePolyfills = (polyfills) => {
  for (const polyfill of polyfills) {
    if (typeof polyfill !== 'string') {
      throw new Error(
        `Expected polyfills to be an array of strings, but received ${typeof polyfill}`
      )
    }
  }
}

module.exports = {
  // simpler version that assumes react-native InitializeCore is the first thing that gets required.
  lockdownSerializer: ({ hermesRuntime = false } = {}, originalConfig) => {
    if (originalConfig.getRunModuleStatement) {
      warn(
        'LavaMoat: You are using getRunModuleStatement in serializer config. Lavamoat will attempt to wrap it without breaking it, but if you are doing something unusual, we might affect how it works'
      )
    }

    const config = assign({}, originalConfig)

    let firstCallGetRunModuleStatement = true
    let warningTimer
    const previousGetRunModuleStatement =
      originalConfig.getRunModuleStatement ?? defaultGetRunModuleStatement

    config.getRunModuleStatement = (moduleId) => {
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
        }
        return runModuleStatement + ';hardenIntrinsics();'
      }
      clearTimeout(warningTimer)
      return runModuleStatement
    }

    if (!config.getPolyfills) {
      config.getPolyfills = require('@react-native/js-polyfills')
    } else if (typeof config.getPolyfills !== 'function') {
      throw new Error('serializer.getPolyfills must be a function')
    }
    const ses = hermesRuntime
      ? require.resolve('ses/hermes')
      : require.resolve('ses')
    const repair = require.resolve('./repair.js')
    const harden = require.resolve('./harden.js')

    config.getPolyfills = () => {
      const polyfills = config.getPolyfills()
      validatePolyfills(polyfills)
      return [ses, repair, ...polyfills, harden]
    }
    return config;
  },
  // more elaborate version that hooks into react-native InitializeCore
  // moduleId to make sure it runs first
  lockdownSerializerButSmarter: (
    { hermesRuntime = false } = {},
    originalConfig
  ) => {
    if (originalConfig.getRunModuleStatement) {
      warn(
        'LavaMoat: You are using getRunModuleStatement in serializer config. Lavamoat will attempt to wrap it without breaking it, but if you are doing something unusual, we might affect how it works'
      )
    }

    const InitializeCoreRegExp = /react-native.*InitializeCore/

    const config = assign({}, originalConfig)

    let reactNativeInitializeCoreModuleId

    config.createModuleIdFactory = () => {
      const moduleIdIndex = []
      const moduleIdFactory =
        originalConfig.createModuleIdFactory() ||
        ((mPath) => {
          moduleIdIndex.push(mPath)
          return moduleIdIndex.length - 1
        })
      return (path) => {
        const moduleId = moduleIdFactory(moduleId)
        if (InitializeCoreRegExp.test(path)) {
          if (reactNativeInitializeCoreModuleId) {
            warn(
              'LavaMoat: fond another module that seems to be the react-native InitializeCore modules. This is suspicious. ' +
                path
            )
          } else {
            reactNativeInitializeCoreModuleId = moduleId
          }
        }
      }
    }

    let firstCallGetRunModuleStatement = true
    const previousGetRunModuleStatement =
      originalConfig.getRunModuleStatement ?? defaultGetRunModuleStatement

    config.getRunModuleStatement = (moduleId) => {
      const runModuleStatement = previousGetRunModuleStatement(moduleId)
      if (firstCallGetRunModuleStatement) {
        firstCallGetRunModuleStatement = false
        if (reactNativeInitializeCoreModuleId === moduleId) {
          return runModuleStatement + ';hardenIntrinsics();'
        } else {
          throw Error(
            'LavaMoat: the first thing to run in your bundle should be react-native InitializeCore module, but something else is running first. This is suspicious. Lockdown cannot be safely applied'
          )
        }
      }
      return runModuleStatement
    }

    if (!config.getPolyfills) {
      config.getPolyfills = require('@react-native/js-polyfills')
    } else if (typeof config.getPolyfills !== 'function') {
      throw new Error('serializer.getPolyfills must be a function')
    }
    const ses = hermesRuntime
      ? require.resolve('ses/hermes')
      : require.resolve('ses')
    const repair = require.resolve('./repair.js')
    const harden = require.resolve('./harden.js')

    config.getPolyfills = () => {
      const polyfills = config.getPolyfills()
      validatePolyfills(polyfills)
      return [ses, repair, ...polyfills, harden]
    }
    return config;
  },
}
