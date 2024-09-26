# @lavamoat/yarn-plugin-allow-scripts

A Yarn Berry plugin for integrating `@lavamoat/allow-scripts` lifecycle-script protection.

### Install

#### Yarn v4

First, perform basic [configuration](https://github.com/LavaMoat/LavaMoat/blob/main/packages/allow-scripts/README.md#configure) of `@lavamoat/allow-scripts` for the package.

The latest version of the plugin can then be installed by its URL:

```sh
yarn plugin import https://raw.githubusercontent.com/LavaMoat/LavaMoat/main/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js
```

#### Yarn v3

The current version of the plugin does not support Yarn v3. Yarn v3 users are encouraged to migrate to an actively supported package manager such as Yarn v4.

A legacy version supporting Yarn v3 can still be installed from the `yarn-plugin-allow-scripts-yarn3` tag:

```sh
yarn plugin import https://raw.githubusercontent.com/LavaMoat/LavaMoat/yarn-plugin-allow-scripts-yarn3/packages/yarn-plugin-allow-scripts/bundles/@yarnpkg/plugin-allow-scripts.js
```

### Contributing

Run `yarn build` after making any changes to the plugin source.
