const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { inspectGlobals, inspectImports } = require('./inspectSource')
const { inspectEnvironment, environmentTypes, environmentTypeStrings } = require('./inspectEnvironment')
const utils = require('./util')

module.exports = {
  inspectGlobals,
  inspectImports,
  utils,
  parse,
  traverse,
  inspectEnvironment,
  environmentTypes,
  environmentTypeStrings
}
