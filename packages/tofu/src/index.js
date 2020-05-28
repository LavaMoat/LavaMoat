const { parse } = require('acorn-globals')
const { inspectGlobals, inspectImports } = require('./inspectSource')
const utils = require('./util')

module.exports = {
  inspectGlobals,
  inspectImports,
  utils,
  parse,
}
