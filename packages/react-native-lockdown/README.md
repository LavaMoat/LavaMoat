# LavaMoat React Native lockdown

LavaMoat React Native lockdown sets up [Hardened JavaScript][hardened-js-ext] in React Native apps.

This is done by repairing Hermes (or JSC) intrinsics at Metro's serializer option _getPolyfills_:

> An optional list of polyfills to include in the bundle. The list defaults to a set of common polyfills for Number, String, Array, Object...

with appropriate [lockdown options][lockdown-options] for React Native, then hardening the intrinsics at Metro's first serializer option _getRunModuleStatement_:

> Specify the format of the initial require statements that are appended at the end of the bundle. By default is `\_\_r(${moduleId});`.

without patching React Native [Core][init-core-ext] where global variables typical in most JavaScript environments are set up.

## Install

```shell
npm i @lavamoat/react-native-lockdown
```

or

```shell
yarn add @lavamoat/react-native-lockdown
```

> [!NOTE]
> @react-native/js-polyfills is a peer dependency, likely stemming from your React Native version (example):
>
> ```log
> project@0.0.1
> ├─┬ @react-native/metro-config@0.72.12 (devDependencies)
> │ └── @react-native/js-polyfills@0.72.1
> └─┬ react-native@0.72.15 (dependencies)
>   └── @react-native/js-polyfills@0.72.1 deduped
> ```

## Usage

### Babel config

```js
// babel.config.js
module.exports = {
  ignore: [/\/ses\.cjs$/, /\/ses-hermes\.cjs$/],
  presets: ['module:@react-native/babel-preset'],
}
```

> [!NOTE]
> If you're still on unsupported React Native <=0.72.x, use the old `'module:metro-react-native-babel-preset'` preset instead

or

```js
// babel.config.js
module.exports = function (api) {
  api.cache(true)
  return {
    ignore: [/\/ses\.cjs$/, /\/ses-hermes\.cjs$/],
    presets: ['babel-preset-expo'],
  }
}
```

> [!WARNING]
> Ensure your Babel config [ignore](https://babeljs.io/docs/options#ignore) `Array<MatchPattern>` ([MatchPattern](https://babeljs.io/docs/options#matchpattern)) `RegExp` is correct for both SES shims to avoid Babel transforming SES and ignoring more than necessary

### Metro config

#### Hermes

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { lockdownSerializer } = require('@lavamoat/react-native')

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  serializer: lockdownSerializer(
    {
      hermesRuntime: true,
    },
    {
      // your previous serializer config if any, for example:
      getPolyfills: () => {
        return [
          ...require('@react-native/js-polyfills')(),
          require.resolve('reflect-metadata'),
        ]
      },
    }
  ),
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

#### JSC

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { lockdownSerializer } = require('@lavamoat/react-native')

/**
 * Metro configuration https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  serializer: lockdownSerializer({
    hermesRuntime: false,
  }),
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

> [!NOTE]
> JSC is [moving to a Community Package][jsc-moving-to-community-package] available starting with React Native 0.79

[hardened-js-ext]: https://hardenedjs.org
[jsc-moving-to-community-package]: https://reactnative.dev/blog/2025/04/08/react-native-0.79#jsc-moving-to-community-package
[init-core-ext]: https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Core/InitializeCore.js
[lockdown-options]: https://github.com/endojs/endo/blob/master/packages/ses/docs/lockdown.md#lockdown-options
