# Runtime protections configurations

## script running

`script-shell=./lavamoat/.runner.cjs` for npm and pnpm and called through a plugin in yarn.

## yarn plugin-allow-scripts

It's a cleaner rewrite of plugin-allow-scripts plugin from Lavamoat repo, for the purpose of installing with cp instead of downloading. The code is verbosely readble to make it more trustworthy.
