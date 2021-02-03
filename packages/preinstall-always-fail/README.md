# Pre-Install Always Fail

Worried about accidentally running `yarn` or `npm` with script hooks enabled such as `preinstall` or `postinstall`? Adding this package to a project mitigates the likelihood of running any lifecycle scripts by throwing an error on `preinstall`.

## Install

```
npm i @lavamoat/preinstall-always-fail
```

## Usage

If the `--ignore-scripts` flag is disabled, running `yarn` or `npm` will fail. Enable the flag and use in conjunction with Lavamoat's [allow-scripts](https://github.com/LavaMoat/LavaMoat/tree/main/packages/allow-scripts) to manually whitelist packages running scripts.
