const acornGlobals = require('acorn-globals')
const whitelist = require('./sesWhitelist').buildWhitelist()
const moduleScope = [
  // commonjs basics
  'module',
  'exports',
  'require',
  // used for extra module features (usually module override via browser field)
  'arguments',
  // common in UMD builds
  'define',
  'this',
]


module.exports = inspectGlobals


function inspectGlobals (code) {
  const ast = acornGlobals.parse(code)
  const result = acornGlobals(ast)

  const filteredResults = result.filter((variable) => {
    // skip if module global
    if (moduleScope.includes(variable.name)) return false
    // check if in SES's whitelist
    const whitelistStatus = whitelist[variable.name]
    if (whitelistStatus) {
      // skip if exactly true (fully whitelisted)
      if (whitelistStatus === true) return false
      // skip if '*' (whitelisted but checks inheritance(?))
      if (whitelistStatus === '*') return false
      // inspect if partial whitelist
      if (typeof whitelistStatus === 'object') return false
    }

    return true
  })
  
  return filteredResults
}