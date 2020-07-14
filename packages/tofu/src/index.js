const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { inspectGlobals, inspectImports, inspectEsmImports } = require('./inspectSource')
const { inspectPrimordialAssignments } = require('./inspectPrimordialAssignments')
const { inspectSesCompat } = require('./inspectSesCompat.js')
const { codeSampleFromAstNode } = require('./codeSampleFromAstNode.js')
const utils = require('./util')

module.exports = {
  inspectGlobals,
  inspectImports,
  inspectEsmImports,
  utils,
  parse,
  traverse,
  inspectPrimordialAssignments,
  inspectSesCompat,
  codeSampleFromAstNode,
}
