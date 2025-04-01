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
const { lockdownSerializer } = require('@lavamoat/react-native-lockdown')

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  // your other config
  serializer: lockdownSerializer(
    {
      hermesRuntime: true,
    },
    {
      // your previous serializer config if any, for example:
      // getPolyfills: () => [require.resolve('reflect-metadata')],
    }
  ),
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```
