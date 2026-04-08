const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const {
  inspectGlobals,
  inspectRequires,
  inspectEsmImports,
  inspectDynamicRequires,
} = require('./inspectSource')
const { codeSampleFromAstNode } = require('./codeSampleFromAstNode')
const {
  inspectPrimordialAssignments,
} = require('./inspectPrimordialAssignments')
const { inspectSesCompat } = require('./inspectSesCompat.js')
const utils = require('./util')
const {
  createGlobalsAnalyzerPass,
  createBuiltinsAnalyzerPass,
  createViolationsAnalyzerPass,
} = require('./analyzer-passes')

module.exports = {
  inspectGlobals,
  /** @deprecated - Use {@link inspectRequires} */
  inspectImports: inspectRequires,
  inspectRequires,
  inspectEsmImports,
  inspectDynamicRequires,
  utils,
  parse,
  traverse,
  inspectPrimordialAssignments,
  inspectSesCompat,
  codeSampleFromAstNode,
  createGlobalsAnalyzerPass,
  createBuiltinsAnalyzerPass,
  createViolationsAnalyzerPass,
}
