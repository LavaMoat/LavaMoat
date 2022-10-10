# @lavamoat/allow-scripts

A tool for running only the dependency lifecycle hooks specified in an _allowlist_.

[Click here for a quick copy-paste setup of allow-scripts](cheatsheet.md). Or continue reading.

> For an overview of LavaMoat tools see [the main README](https://github.com/LavaMoat/LavaMoat/tree/main/README.md)


## Install

Our recommendation is to install `@lavamoat/allow-scripts` globally using npm and then run the setup command for each repository with the choice of local package manager.  Remembering how to skip running scripts on initial install across yarn version is prone to human error.

Be sure to include the `@lavamoat/` namespace in the package name

### Install globally 
For the convenience of your initial setup, it's nice to have allow-scripts installed globally.

```sh
npm i -g @lavamoat/allow-scripts
```
or in yarn classic
```sh
yarn global add @lavamoat/allow-scripts
```

Setup step will also install the local copy in the repository, so that your team doesn't need to prepare anything.

### Local installation

If you (or your package manager) prefer to not install allow-scripts globally you can install it as a dev dependency. Be careful not to run lifecycle scripts in the project while you do it before the initial setup. 

```sh
npm i --ignore-scripts -D @lavamoat/allow-scripts
```
yarn classic
```sh
yarn add --ignore-scripts -D @lavamoat/allow-scripts
```
yarn berry
```sh
yarn add --mode=skip-build -D @lavamoat/allow-scripts
```

> **Info** If you're using local installation, use the commands in further steps with the following prefixes:

```sh
yarn allow-scripts (...)
```
or
```sh
npx --no-install allow-scripts (...)
```

> **Warning** if @lavamoat/allow-scripts was not installed prior, npx will try to download and run allow-scripts (note no namespace prefix) which is a different package. We suggest adding --no-install to prevent accidents.

## Setup
 
```sh
allow-scripts setup
```
Choose which pakcage manager to use with the project:
```sh
allow-scripts setup --pkg=yarn
```

Setup adds a `.npmrc` or `.yarnrc` or `.yarnrc.yml` to the project, populates the file with the configuration to turn off lifecycle scripts. Immediately after that, adds the dependency `@lavamoat/preinstall-always-fail`.

Adding this package to a project **mitigates** the likelihood of accidentally running any lifecycle scripts by throwing an error during the `preinstall` script execution in package managers (except yarn berry, which ignores script failures).


## Generate configuration

Automatically generates and writes a configuration into `package.json`, setting new policies as `false` by default. Edit this file as necessary.

```sh
allow-scripts auto
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

## Run

Run **all** lifecycle scripts for the packages specified as allowed in `package.json->lavamoat->allowScripts`

```sh
allow-scripts
```

It will fail if it detects dependencies which haven't been set up during [configuration](#generate-configuration) of the package. You will be advised to run `allow-scripts auto`.

### Improving your Workflow

Consider adding a _setup_ npm script for all your post-install steps to ensure the running of your allowed scripts. This can be just a regular script (_no magic needed!_). Also, it is a good place to add other post-processing commands you want to use.

In the future when you add additional post-processing scripts, e.g. [`patch-package`](https://www.npmjs.com/package/patch-package), you can add them to this _setup_ script.

:thought_balloon: You will need to make an effort to remember to run `yarn setup` or `npm run setup` instead of the regular install command :lotus_position:

```json
{
  "scripts": {
    "setup": "npm ci && allow-scripts && ..."
  }
}
```
```json
{
  "scripts": {
    "setup": "yarn && allow-scripts && ..."
  }
}
```

## Debug

Prints comprehension of configuration and dependencies with lifecycle scripts, specifying _allowed_ and _disallowed_ packages.

```sh
allow-scripts list
```



