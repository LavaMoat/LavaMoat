// The "prelude" is the kernel of a browserify bundle. It initializes the modules and
// provides the `require` api. Sesify's prelude content has been modified significantly from the
// original `browser-pack` prelude for readability + sandboxing in SES containers
// The prelude is defined in the `preludeTemplate` file, and here we inject the dynamic components,
// such as the upgradeable SES and app specific config.

const fs = require('fs')
const jsonStringify = require('json-stable-stringify')
const preludeTemplate = fs.readFileSync(__dirname + '/preludeTemplate.js', 'utf8')
const kowtowDist = fs.readFileSync(__dirname + '/../lib/kowtow.umd.js', 'utf8')
const sessDist = fs.readFileSync(__dirname + '/../lib/ses.umd.js', 'utf8')

module.exports = generatePrelude

function generatePrelude (opts = {}) {
  const sesifyConfig = parseConfig(opts.sesifyConfig)

  let output = preludeTemplate
  output = output.replace('__kowtowDist__', kowtowDist)
  output = output.replace('__sessDist__', sessDist)
  output = output.replace('__sesifyConfig__', sesifyConfig)

  return output
}

function parseConfig (config) {
  switch (typeof config) {
    case 'string':
      // parse as json if possible, otherwise interpret as js
      if (isJsonString(config)) {
        return `return ${config}`
      } else {
        return config
      }
    // allow sesifyConfig to be specified as a function for loading fresh result under watchify
    case 'function':
      return parseConfig(config())
    case 'object':
      const configJson = jsonStringify(config, { space: 2 })
      return `return ${configJson}`
    case 'undefined':
      return 'return {}'
    default:
      throw new Error('Sesify - unrecognized endowments config option')
  }
}

function isJsonString (input) {
  try {
    JSON.parse(input)
    return true
  } catch (err) {
    return false
  }
}