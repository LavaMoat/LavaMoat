// The "prelude" is the kernel of a browserify bundle. It initializes the modules and
// provides the `require` api. LavaMoat's prelude content has been modified significantly from the
// original `browser-pack` prelude for readability + sandboxing in SES containers
// The prelude is defined in the `preludeTemplate` file, and here we inject the dynamic components,
// such as the upgradeable SES and app specific config.

const fs = require('fs')
const path = require('path')
const preludeTemplate = fs.readFileSync(path.join(__dirname, '/preludeTemplate.js'), 'utf-8')
const kernelTemplate = fs.readFileSync(path.join(__dirname, '/kernelTemplate.js'), 'utf-8')
const kernelCoreTemplate = fs.readFileSync(path.join(__dirname, '/kernelCoreTemplate.js'), 'utf-8')
const sesSrc = fs.readFileSync(path.join(__dirname, '/../lib/lockdown.umd.js'), 'utf-8')
const makeGetEndowmentsForConfigSrc = fs.readFileSync(path.join(__dirname, '/makeGetEndowmentsForConfig.js'), 'utf-8')
const makePrepareRealmGlobalFromConfigSrc = fs.readFileSync(path.join(__dirname, '/makePrepareRealmGlobalFromConfig.js'), 'utf-8')
const makeGeneralUtilsSrc = fs.readFileSync(path.join(__dirname, '/makeGeneralUtils.js'), 'utf-8')

module.exports = {
  getSesShimSrc,
  generateKernel,
  generateKernelCore,
  generatePrelude
}

function getSesShimSrc () {
  return sesSrc
}

// takes the preludeTemplate and populates it with the kernel
function generatePrelude (opts = {}) {
  const kernelCode = generateKernel(opts)

  let output = preludeTemplate
  output = stringReplace(output, '__createKernel__', kernelCode)

  return output
}

// takes the kernelTemplate and populates it with the libraries
function generateKernel (opts = {}) {
  const debugMode = Boolean(opts.debugMode)
  const kernelCode = generateKernelCore(opts)

  let output = kernelTemplate
  output = replaceTemplateRequire(output, 'ses', sesSrc)
  output = stringReplace(output, '__lavamoatDebugMode__', debugMode ? 'true' : 'false')
  output = stringReplace(output, '__createKernelCore__', kernelCode)

  return output
}

// takes the kernelCoreTemplate and populates it with the libraries
function generateKernelCore (opts = {}) {
  let output = kernelCoreTemplate
  output = replaceTemplateRequire(output, 'makeGetEndowmentsForConfig', makeGetEndowmentsForConfigSrc)
  output = replaceTemplateRequire(output, 'makePrepareRealmGlobalFromConfig', makePrepareRealmGlobalFromConfigSrc)
  output = replaceTemplateRequire(output, 'makeGeneralUtils', makeGeneralUtilsSrc)
  return output
}

function replaceTemplateRequire (code, moduleName, src) {
  const wrappedSrc = wrapWithReturnCjsExports(moduleName, src)
  code = stringReplace(code, `templateRequire('${moduleName}')`, wrappedSrc)
  return code
}

// this wraps the content of a commonjs module with an IIFE that returns the module.exports
function wrapWithReturnCjsExports (label, src) {
  if (String(label).includes('\n')) {
    throw new Error('Lavamoat - "wrapWithReturnCjsExports" does not allow labels with newlines')
  }
  return (
`// define ${label}
(function(){
  const global = globalRef
  const exports = {}
  const module = { exports }
  ;(function(){
// START of injected code from ${label}
${src}
// END of injected code from ${label}
  })()
  return module.exports
})()`
  )
}

// String.prototype.replace has special behavior for some characters, so we use split join instead
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
function stringReplace (src, target, replacement) {
  return src.split(target).join(replacement)
}
