// This postinstall hook creates mitm/node.
// This attempts to replace all calls to node with lavamoat, provided
// that the mitm directory is appears before Node.js's bin directory on the
// environment PATH.
// this has been borrowed and modified from https://github.com/agoric/ses-shim

const fs = require('fs')
const path = require('path')

const node = process.env.NVM_BIN ? `${process.env.NVM_BIN}/node` : process.argv[0]
const npxPath = path.resolve(node, '../npx')
const lavamoat = require.resolve('lavamoat/src/index.js')
const lockdown = new URL('../src/lockdown.cjs', `file://${__filename}`).pathname
const mitm = new URL('../mitm/node', `file://${__filename}`).pathname

const script = `#!/bin/sh
set -xueo pipefail

npxpath="${npxPath}"
eval yarnpath="~/.yarn/bin/yarn.js"

if [ "$1" = "$yarnpath" ]; then
    echo "its yarn, running unwrapped"
    ${node} "$@";
elif [ "$1" = "$npxpath" ]; then
  echo "its npx, running unwrapped"
  ${node} "$@";
else
  echo "unknown, running with lavamoat"
  ${node} ${lavamoat} --writeAutoConfigAndRun "$@"
fi
`

/*
  /home/xyz/.nvm/versions/node/v12.16.1/bin/node \
  /home/xyz/Development/lavamoat/packages/survey/node_modules/lavamoat/src/index.js \
  --writeAutoConfigAndRun \
  /home/xyz/.yarn/bin/yarn.js 'run test'
*/

fs.writeFileSync(mitm, script, 'utf-8')
fs.chmodSync(mitm, 0o755)
