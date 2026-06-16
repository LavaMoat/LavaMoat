# Runtime protections configurations

## script running

`script-shell=./lavamoat/.runner.js` for npm and pnpm and called through a plugin in yarn.

## yarn plugin-allow-scripts

It's a copy of the plugin-allow-scripts plugin from Lavamoat repo, for the purpose of installing with cp instead of downloading.
