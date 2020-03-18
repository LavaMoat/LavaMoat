// The "prelude" is the kernel of a browserify bundle. It initializes the modules and
// provides the `require` api. LavaMoat's prelude content has been modified significantly from the
// original `browser-pack` prelude for readability + sandboxing in SES containers
// The prelude is defined in the `preludeTemplate` file, and here we inject the dynamic components,
// such as the upgradeable SES and app specific config.

const fs = require('fs')
const path = require('path')
const preludeTemplate = fs.readFileSync(path.join(__dirname, '/preludeTemplate.js'), 'utf-8')
const sesSrc = fs.readFileSync(path.join(__dirname, '/../lib/ses.umd.js'), 'utf-8')
const makeGetEndowmentsForConfigSrc = fs.readFileSync(path.join(__dirname, '/makeGetEndowmentsForConfig.js'), 'utf-8')
const makePrepareRealmGlobalFromConfigSrc = fs.readFileSync(path.join(__dirname, '/makePrepareRealmGlobalFromConfig.js'), 'utf-8')

module.exports = generatePrelude

// takes the preludeTemplate and populates it with the config + libraries
function generatePrelude (opts = {}) {
  const debugMode = Boolean(opts.debugMode)

  let output = preludeTemplate
  output = output.replace('__lavamoatDebugMode__', debugMode ? 'true' : 'false')

  replaceTemplateRequire('ses', sesSrc)
  replaceTemplateRequire('cytoplasm', fs.readFileSync(require.resolve('cytoplasm/dist/index'), 'utf8'))
  replaceTemplateRequire('cytoplasm/distortions/readOnly', fs.readFileSync(require.resolve('cytoplasm/src/distortions/readOnly'), 'utf8'))
  replaceTemplateRequire('makeGetEndowmentsForConfig', makeGetEndowmentsForConfigSrc)
  replaceTemplateRequire('makePrepareRealmGlobalFromConfig', makePrepareRealmGlobalFromConfigSrc)

  function replaceTemplateRequire (moduleName, src) {
    const wrappedSrc = wrapWithReturnCjsExports(moduleName, src)
    output = output.replace(`templateRequire('${moduleName}')`, wrappedSrc)
  }

  return output
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
