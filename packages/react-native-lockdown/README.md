# LavaMoat React Native lockdown

LavaMoat React Native lockdown sets up Hardened JavaScript in React Native apps.

This is done by hooking into Metro's serializer option _getPolyfills_:

> An optional list of polyfills to include in the bundle. The list defaults to a set of common polyfills for Number, String, Array, Object...

which runs `lockdown` JS before React Native sets up global variables typical in most JavaScript environments in [InitializeCore.js](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/InitializeCore.js).

## Examples

### Hermes

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const makeGetPolyfills = require('@lavamoat/react-native-lockdown')

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  serializer: {
    getPolyfills: () => makeGetPolyfills({ engine: 'hermes' }),
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

Under the hood, this runs the Hermes transform of the SES shim.

### Hermes with vetted shim

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const makeGetPolyfills = require('@lavamoat/react-native-lockdown')

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  serializer: {
    getPolyfills: () =>
      makeGetPolyfills({
        engine: 'hermes',
        polyfills: [require.resolve('reflect-metadata')],
      }),
  },
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

In this example you may have pre-vetted `reflect-metadata` as a safe polyfill to include in your Hardened JS setup.

### Android on Hermes, iOS on JSC

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const makeGetPolyfills = require('@lavamoat/react-native-lockdown')

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  serializer: {
    getPolyfills: ({platform}) =>
      makeGetPolyfills({
        engine: platform === 'android' ? 'hermes' : 'jsc',
      }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

Under the hood this runs the Hermes transform of the SES shim on Android, otherwise the vanilla SES shim on iOS.
