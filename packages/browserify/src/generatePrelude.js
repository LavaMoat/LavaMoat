// prelude content modified from original browser-pack prelude for readability + SES support
const fs = require('fs')
const preludeTemplate = fs.readFileSync(__dirname + '/preludeTemplate.js', 'utf8')
const sessDist = fs.readFileSync(__dirname + '/ses.js', 'utf8')

module.exports = generatePrelude

function generatePrelude(opts = {}) {

  const endowmentsConfig = parseEndowmentsConfig(opts.endowmentsConfig)

  let output = preludeTemplate
  output = output.replace('__sessDist__', sessDist)
  output = output.replace('__endowmentsConfig__', endowmentsConfig)

  return output
}

function parseEndowmentsConfig (config) {
  switch (typeof config) {
    case 'string':
      return config
    // allow endowmentsConfig to be specified as a function for loading fresh result under watchify
    case 'function':
      return parseEndowmentsConfig(config())
    case 'object':
      const configJson = JSON.stringify(config, null, 2)
      return `return ${configJson}`
    case 'undefined': 
      return 'return {}'
    default:
      throw new Error('Sesify - unrecognized endowments config option')
  }
}