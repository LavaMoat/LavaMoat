// The "prelude" is the kernel of a browserify bundle. It initializes the modules and
// provides the `require` api. LavaMoat's prelude content has been modified significantly from the
// original `browser-pack` prelude for readability + sandboxing in SES containers
// The prelude is defined in the `preludeTemplate` file, and here we inject the dynamic components,
// such as the upgradeable SES and app specific config.

const fs = require('fs')
const jsonStringify = require('json-stable-stringify')
const preludeTemplate = fs.readFileSync(__dirname + '/preludeTemplate.js', 'utf8')
const sessDist = fs.readFileSync(__dirname + '/../lib/ses.umd.js', 'utf8')
const magicCopySrc = fs.readFileSync(__dirname + '/magicCopy.js', 'utf8')

module.exports = generatePrelude

function generatePrelude (opts = {}) {
  const lavamoatConfig = parseConfig(opts.lavamoatConfig)

  let output = preludeTemplate
  output = output.replace('__sessDist__', sessDist)
  output = output.replace('__magicCopy__', magicCopySrc)
  output = output.replace('__lavamoatConfig__', lavamoatConfig)

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
    // allow lavamoatConfig to be specified as a function for loading fresh result under watchify
    case 'function':
      return parseConfig(config())
    case 'object':
      const configJson = jsonStringify(config, { space: 2 })
      return `return ${configJson}`
    case 'undefined':
      return 'return {}'
    default:
      throw new Error('LavaMoat - unrecognized endowments config option')
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