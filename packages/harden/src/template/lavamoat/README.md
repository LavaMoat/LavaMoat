# Runtime protections configurations

## script running

The `lavamoat-permissioned-runner` bin (provided by `@lavamoat/permissioned-runner`, a devDependency added by `harden`) is used as `script-shell` for npm and pnpm, and loaded through a bundled plugin file (`.runner-plugin.js`) in yarn.

## yarn plugin-allow-scripts

It's a cleaner rewrite of plugin-allow-scripts plugin from Lavamoat repo, for the purpose of installing with cp instead of downloading. The code is verbosely readble to make it more trustworthy.
