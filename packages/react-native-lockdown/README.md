# LavaMoat React Native lockdown

LavaMoat React Native lockdown sets up Hardened JavaScript in React Native apps.

This is done by hooking into Metro's serializer option _getPolyfills_:

> An optional list of polyfills to include in the bundle. The list defaults to a set of common polyfills for Number, String, Array, Object...

which runs `lockdown` JS before React Native sets up global variables typical in most JavaScript environments in [InitializeCore.js](https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/InitializeCore.js).

## Install

```shell
npm i @lavamoat/react-native-lockdown
```

or

```shell
yarn add @lavamoat/react-native-lockdown
```

## Usage

### Babel config

```js
// babel.config.js
module.exports = {
  ignore: [
    /ses\.cjs/,
    /ses-hermes\.cjs/
  ],
  presets: ['module:metro-react-native-babel-preset']
}
```

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

## Troubleshooting

> [!IMPORTANT]
>
> Remember to `react-native start --reset-cache` or `react-native bundle --reset-cache` after Babel or Metro config changes to removed cached files (default: false).
> This will ensure a fresh build/bundle with your configuration changes, rather than relying on hot-reload or hot/cold starts.

### ReferenceError: Property 'require' doesn't exist

<img width="466" alt="Screenshot 2025-04-03 at 1 25 08 pm" src="https://github.com/user-attachments/assets/1beb4f08-e1a1-45a2-9d3c-7187fe47540b" />

Upon inspecting the bundle, the reference error is throwing early when evaluating the SES shim.

It is clear Babel is preparing it to be transformed:

```js
// http://localhost:8081/index.bundle//&platform=android
// ...
(function (global) {
  var _asyncToGenerator = require("@babel/runtime/helpers/asyncToGenerator");
  var _toArray = require("@babel/runtime/helpers/toArray");
  var _objectWithoutProperties = require("@babel/runtime/helpers/objectWithoutProperties");
  var _toConsumableArray = require("@babel/runtime/helpers/toConsumableArray");
  var _slicedToArray = require("@babel/runtime/helpers/slicedToArray");
  var _defineProperty = require("@babel/runtime/helpers/defineProperty");
  var _objectDestructuringEmpty = require("@babel/runtime/helpers/objectDestructuringEmpty");
  var _excluded = ["name", "message", "errors", "cause", "stack"],
    _excluded2 = ["random"],
    _excluded3 = ["__options__"],
    _excluded4 = ["errorTaming", "errorTrapping", "reporting", "unhandledRejectionTrapping", "regExpTaming", "localeTaming", "consoleTaming", "overrideTaming", "stackFiltering", "domainTaming", "evalTaming", "overrideDebug", "legacyRegeneratorRuntimeTaming", "__hardenTaming__", "dateTaming", "mathTaming"];
  function _defineAccessor(e, r, n, t) { var c = { configurable: !0, enumerable: !0 }; return c[e] = t, Object.defineProperty(r, n, c); }
  // ses@1.12.0
  (function (functors) {
// ...
```

Simply ensure Babel is configured to ignore your flavour of SES shim like in the [babel config][babel-config] example.

Now it should look much cleaner:

```js
// http://localhost:8081/index.bundle//&platform=android
// ...
(function (global) {
  // ses@1.12.0
  (functors => options => {
// ...
```

[babel-config]: #babel-config
