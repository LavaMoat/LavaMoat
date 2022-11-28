# @lavamoat/allow-scripts

A tool for running only the dependency lifecycle hooks specified in an _allowlist_.

> For an overview of LavaMoat tools see [the main README](https://github.com/LavaMoat/LavaMoat/tree/main/README.md)


### Install

Adds the package to start using it in your project. be sure to include the `@lavamoat/` namespace in the package name

```sh
yarn add -D @lavamoat/allow-scripts
```
or
```sh
npm i -D @lavamoat/allow-scripts
```

### Setup

```sh
yarn allow-scripts setup
```
or
```sh
npx --no-install allow-scripts setup
```

> **Warning** if @lavamoat/allow-scripts was not installed prior, npx will try to download and run allow-scripts (note no namespace prefix) which is a different package. We suggest adding --no-install to prevent accidents.

Adds a `.yarnrc` or `.npmrc` (the latter if `package-lock.json` is present) to the package, populates this file with the line `ignore-scripts true`. Immediately after that, adds the dependency `@lavamoat/preinstall-always-fail`.

Adding this package to a project **mitigates** the likelihood of accidentally running any lifecycle scripts by throwing an error during the `preinstall` script execution.


### Configure

Automatically generates and writes a configuration into `package.json`, setting new policies as `false` by default. Edit this file as necessary.

```sh
yarn allow-scripts auto
```
or
```sh
npx --no-install allow-scripts auto
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

> **Note** While you can configure all install scripts that you've been running to date as allowed, it's best to limit the number of them in case a package with pre-existing install script gets exploited. To figure out which packages' scripts can be ignored, try [can-i-ignore-scripts](https://www.npmjs.com/package/can-i-ignore-scripts)

### Run

Run **all** lifecycle scripts for the packages specified in `package.json`

```sh
yarn allow-scripts
```
or
```sh
npx --no-install allow-scripts
```

This is a shorthand for `yarn/npx allow-scripts run`.

It will fail if it detects dependencies which haven't been set up during [configuration](#Configure) of the package. You will be advised to run `yarn allow-scripts auto`.

### Debug

Prints comprehension of configuration and dependencies with lifecycle scripts, specifying _allowed_ and _disallowed_ packages.

```sh
yarn allow-scripts list
```
or
```sh
npx --no-install allow-scripts list
```

### Improving your Workflow

Consider adding a _setup_ npm script for all your post-install steps to ensure the running of your allowed scripts. This can be just a regular script (_no magic needed!_). Also, it is a good place to add other post-processing commands you want to use.

In the future when you add additional post-processing scripts, e.g. [`patch-package`](https://www.npmjs.com/package/patch-package), you can add them to this _setup_ script.

:thought_balloon: You will need to make an effort to remember to run `yarn setup` instead of just `yarn` :lotus_position:

```json
{
  "scripts": {
    "setup": "yarn install && yarn allow-scripts && ..."
  }
}
```

# Experimental protection against bin script confusion

Bin script confusion is a new attack where a dependency gets its script to run by declaring executables that end up on the path and later get triggered either by the user or by other programs. More details in [npm bin script confusion: Abusing ‘bin’ to hijack ‘node’ command](https://socket.dev/blog/npm-bin-script-confusion) by Socket.dev

To enable protection against bin script confusion, run all of the above `allow-scripts` commands with the `--experimental-bins` flag.

What does it do?

- `setup` will add a new configuration option to your project package manager RC file to disable linking up bin scripts
- `auto` will generate an allowlist of top-level bin scripts allowed for execution
- `run` will link up the allowed scripts and replace not allowed scripts with an error

When you attempt to run a bin script not in the allowlist, you will get an error with instructions on how to enable it manually.
