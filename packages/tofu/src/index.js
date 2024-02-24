const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const {
  inspectGlobals,
  inspectRequires,
  inspectEsmImports,
  inspectDynamicRequires,
} = require('./inspectSource')
const {
  inspectPrimordialAssignments,
} = require('./inspectPrimordialAssignments')
const { inspectSesCompat } = require('./inspectSesCompat.js')
const utils = require('./util')

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
}
