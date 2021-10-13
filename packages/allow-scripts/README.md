# @lavamoat/allow-scripts

A tool for running only the dependency lifecycle hooks specified in an _allowlist_.

### Install

Adds the package to start using it in your project. be sure to include the `@lavamoat/` namespace in the package name

```sh
yarn add -D @lavamoat/allow-scripts
```

### Configure

Automatically generates and writes a configuration into `package.json`, setting new policies as `false` by default. Edit this file as necessary.

```sh
yarn allow-scripts auto
```

Configuration goes in `package.json`

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

### Run

Run **all** lifecycle scripts for the packages specified in `package.json`

```sh
yarn allow-scripts
```

This is a shorthand for `yarn allow-scripts run`.

It will fail if it detects dependencies who haven't been set up during [configuration](#Configure) of the package. You will be advised to run `yarn allow-scripts auto`.

### Debug

Prints comprehension of configuration and dependencies with lifecycle scripts, specifying _allowed_ and _disallowed_ packages.

```sh
yarn allow-scripts list
```

### Improving your Workflow

Consider adding a _setup_ npm script for all your post-install steps to ensure the running of your allowed scripts. This can be just a regular script (_no magic needed!_). Also, it is a good place to add other post-processing commands you want to use.

In the future when you add additional post-processing scripts, e.g. [`patch-package`](https://github.com/ds300/patch-package), you can add them to this _setup_ script.

:thought_balloon: You will need to make an effort to remember to run `yarn setup` instead of just `yarn` :lotus_position:

```json
{
  "scripts": {
    "setup": "yarn install && yarn allow-scripts && ..."
  }
}
```
