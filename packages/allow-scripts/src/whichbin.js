#!/usr/bin/env node
/* eslint-disable node/shebang */

// @ts-check
const path = require('path')
const { getOptionsForBin } = require('./index.js')
const { FEATURE } = require('./toggles.js')

start().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function start () {
  FEATURE.bins = true
  const binName = path.basename(process.argv[1])
  const rootDir = process.env.INIT_CWD || process.cwd()
  const currentBinCandidates = await getOptionsForBin({ rootDir, name: binName })

  if(!currentBinCandidates) {
    return console.error(`There's no candidates to run as the '${binName}' bin script`)
  }

  console.error(`-lavamoat--allow-scripts---------------------------------------------------
There's no policy for the '${binName}' bin script. 
You can allow this script to run by adding it to lavamoat->allowBins in package.json

Add a line like this in allowBins:
  "${binName}": "${currentBinCandidates[0].fullLinkPath}"
`)
  if (currentBinCandidates.length > 1) {
    console.error(`Choose one of the following paths for the value:

  ${currentBinCandidates.map(c => c.fullLinkPath).join('\n')}
`)
  }
  
  console.error(`After you're done configuring, run allow-scripts again.
---------------------------------------------------------------------------`)

  process.exit(42)
  
}
