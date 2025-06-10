# LavaMoat React Native lockdown

LavaMoat React Native lockdown sets up [Hardened JavaScript][hardened-js-ext] in React Native apps.

This is achieved by repairing and hardening the JS engine shared intrinsics. LavaMoat React Native lockdown integrates with Metro through serializer options.

> [!WARNING]
> This has not been tested on Static Hermes _yet_! Only on default side-by-side versions of Hermes that shipped with React Native.

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

Add the following to your Babel config:

```js
ignore: [/\/ses\.cjs$/, /\/ses-hermes\.cjs$/],
```

#### React Native

```js
// babel.config.js
module.exports = {
  ignore: [/\/ses\.cjs$/, /\/ses-hermes\.cjs$/],
  presets: ['module:@react-native/babel-preset'],
}
```

#### React Native <= 0.72.x

```js
// babel.config.js
module.exports = {
  ignore: [/\/ses\.cjs$/, /\/ses-hermes\.cjs$/],
  presets: ['module:metro-react-native-babel-preset'],
}
```

> [!NOTE]
> React Native <= 0.76.x (old minor series) are [unsupported][react-native-releases-support-ext]

#### Expo

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
> Ensure your Babel config [ignore][babel-ignore-ext] `Array<MatchPattern>` ([MatchPattern][babel-matchpattern-ext]) `RegExp` is correct for both SES shims to avoid Babel transforming SES and ignoring more than necessary.

### Metro config

This section describes how to use `lockdownSerializer` to configure Metro.

#### Hermes

##### New config

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { lockdownSerializer } = require('@lavamoat/react-native-lockdown')

const config = {
  serializer: lockdownSerializer({ hermesRuntime: true }),
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

##### Existing config

If you already used a serializer configuration, you can pass it as second argument.
`lockdownSerializer` will provide the `@react-native/js-polyfills` by default, but if you specified your own `getPolyfills` function, Metro is expecting you to provide the polyfills and `lockdownSerializer` follows that behavior too.

Some modules depend on language features that may not be present in the underlying platform.
Shims (other programs that alter JavaScript) may be added, but are obliged to maintain the object capability safety invariants provided by Lockdown and must be carefully reviewed. We call these ["vetted shims"][vetted-shims-ext].

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { lockdownSerializer } = require('@lavamoat/react-native')

const config = {
  serializer: lockdownSerializer(
    { hermesRuntime: true },
    {
      // your previous serializer config if any, for example:
      getPolyfills: () => {
        return [
          ...require('@react-native/js-polyfills')(),
          require.resolve('path-to-shim'), // e.g. 'reflect-metadata'
        ]
      },
    }
  ),
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
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

#### JavaScriptCore (JSC)

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const { lockdownSerializer } = require('@lavamoat/react-native')

const config = {
  serializer: lockdownSerializer({ hermesRuntime: false }),
}

module.exports = mergeConfig(getDefaultConfig(__dirname), config)
```

> [!NOTE]
> JSC is [moving to a Community Package][jsc-moving-to-community-package] available starting with React Native 0.79.

#### V8

Untested on [react-native-v8][react-native-v8-ext], an opt-in V8 runtime for Android only.

[babel-ignore-ext]: https://babeljs.io/docs/options#ignore
[babel-matchpattern-ext]: https://babeljs.io/docs/options#matchpattern
[hardened-js-ext]: https://hardenedjs.org
[jsc-moving-to-community-package]: https://reactnative.dev/blog/2025/04/08/react-native-0.79#jsc-moving-to-community-package
[react-native-releases-support-ext]: https://github.com/reactwg/react-native-releases/blob/main/docs/support.md
[react-native-v8-ext]: https://github.com/Kudo/react-native-v8
[vetted-shims-ext]: https://github.com/endojs/endo/blob/master/packages/ses/docs/guide.md#using-hardened-javascript-with-vetted-shims

## License

Copyright (c) 2024 Consensys Software Inc. Licensed MIT
