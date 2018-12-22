// prelude content modified from original browser-pack prelude for readability + SES support
const fs = require('fs')
const preludeTemplate = fs.readFileSync(__dirname + '/preludeTemplate.js', 'utf8')

module.exports = generatePrelude

function generatePrelude(opts = {}) {
  const defaultEndowments = opts.defaultEndowments || `{
    console: {
      assert: console.assert.bind(console),
      debug: console.debug.bind(console),
      error: console.error.bind(console),
      info: console.info.bind(console),
      log: console.log.bind(console),
      warn: console.warn.bind(console),
    },
  }`

  const endowmentsConfig = opts.endowmentsConfig || '{}'

  let output = preludeTemplate
  output = output.replace('__defaultEndowments__', defaultEndowments)
  output = output.replace('__endowmentsConfig__', endowmentsConfig)

  return output
}
