// prelude content modified from original browser-pack prelude for readability + SES support
const fs = require('fs')
const preludeTemplate = fs.readFileSync(__dirname + '/preludeTemplate.js', 'utf8')
const sessDist = fs.readFileSync(__dirname + '/ses.js', 'utf8')

module.exports = generatePrelude

function generatePrelude(opts = {}) {

  let endowmentsConfig = opts.endowmentsConfig || 'return {}'
  // allow endowmentsConfig to be specified as a function for better refresh
  if (typeof opts.endowmentsConfig === 'function') {
    endowmentsConfig = opts.endowmentsConfig()
  }

  let output = preludeTemplate
  output = output.replace('__sessDist__', sessDist)
  output = output.replace('__endowmentsConfig__', endowmentsConfig)

  return output
}
