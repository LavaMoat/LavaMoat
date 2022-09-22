#!/usr/bin/env node
/* eslint-disable no-eval */

const yargs = require('yargs')
const yargsFlags = require('./yargsFlags')
const { runLava } = require('./index')

const defaults = require('./defaults')

runLava(parseArgs()).catch(err => {
  // explicity log stack to workaround https://github.com/endojs/endo/issues/944
  console.error(err.stack || err)
  process.exit(1)
})


function parseArgs () {
  const argsParser = yargs
    .usage('$0 <entryPath>', 'start the application', (yargs) => {
      // the entry file to run (or parse)
      yargs.positional('entryPath', {
        describe: 'the path to the entry file for your application. same as node.js',
        type: 'string'
      })
      yargsFlags(yargs, defaults)
    })
    .help()

  const parsedArgs = argsParser.parse()

  return parsedArgs
}
