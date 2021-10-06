# @lavamoat/allow-scripts

A tool for running only the dependency-lifecycle-hooks specified in an _allowlist_.

### Install

Adds the package to start using it in your project. be sure to include the `@lavamoat/` namespace in the package name

```sh
yarn add -D @lavamoat/allow-scripts [--ignore-scripts]
```

#### The `--ignore-scripts` flag

Without the `--ignore-scripts` flag, the installation of the dependency will fail, as it has the `@lavamoat/preinstall-always-fail` dependency, which in turn is a protection from unwanted `preinstall` scripts.

Keep reading this documentation to understand why either you want to install this dependency before any other with the `--ignore-scripts` flag, or whether you want to add this dependency and set up a whitelist.

### Configure

Automatically generates a configuration (that skips all lifecycle scripts) and write into `package.json`. edit as necesary.

```sh
yarn allow-scripts auto
```

configuration goes in `package.json`
```json
{
  "lavamoat": {
    "allowScripts": {
      "keccak": true,
      "core-js": false
    }
  }
}
```

### disable scripts

disable all scripts by default inside `.yarnrc` or `.npmrc`
```
ignore-scripts true
```

consider adding [`@lavamoat/preinstall-always-fail`](../preinstall-always-fail) to ensure you never accidently run install scripts
```
yarn add -D @lavamoat/preinstall-always-fail
```

### run

run all lifecycle scripts for packages specified in `package.json`
```sh
yarn allow-scripts
```

### debug

prints comprehension of configuration and dependencies with lifecycle scripts
```sh
yarn allow-scripts list
```

### workflow

consider adding a "setup" npm script for all your post-install steps. no magic here, this is just a regular script. but using this will ensure you run your allowed scripts. its also a good place to add other post-processing commands you use. In the future when you add additional post-processing scripts, e.g. [`patch-package`](https://github.com/ds300/patch-package), you can add them to this "setup" script.

you will need to make an effort to remember to run `yarn setup` instead of just `yarn` :lotus_position:

```json
{
  "scripts": {
    "setup": "yarn install && yarn allow-scripts && ..."
  }
}
```
