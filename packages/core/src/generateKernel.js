// The "prelude" is the kernel of a browserify bundle. It initializes the modules and
// provides the `require` api. LavaMoat's prelude content has been modified significantly from the
// original `browser-pack` prelude for readability + sandboxing in SES containers
// The prelude is defined in the `preludeTemplate` file, and here we inject the dynamic components,
// such as the upgradeable SES and app specific config.

const fs = require('node:fs')
const path = require('node:path')
const kernelTemplate = fs.readFileSync(
  path.join(__dirname, '/kernelTemplate.js'),
  'utf-8'
)
const kernelCoreTemplate = fs.readFileSync(
  path.join(__dirname, '/kernelCoreTemplate.js'),
  'utf-8'
)
const sesSrc = fs.readFileSync(
  path.join(__dirname, '/../lib/lockdown.umd.js'),
  'utf-8'
)
const endowmentsToolkitSrc = fs.readFileSync(
  path.join(__dirname, '/endowmentsToolkit.js'),
  'utf-8'
)
const scuttleSrc = fs.readFileSync(require.resolve('./scuttle.js'), 'utf-8')
const makePrepareRealmGlobalFromConfigSrc = fs.readFileSync(
  path.join(__dirname, '/makePrepareRealmGlobalFromConfig.js'),
  'utf-8'
)
const strictScopeTerminatorSrc = fs.readFileSync(
  path.join(__dirname, '/../lib/strict-scope-terminator.js'),
  'utf-8'
)

module.exports = {
  replaceTemplateRequire,
  getStrictScopeTerminatorShimSrc,
  getSesShimSrc,
  generateKernel,
  generateKernelCore,
}

function getSesShimSrc() {
  return sesSrc
}

function getStrictScopeTerminatorShimSrc() {
  return strictScopeTerminatorSrc
}

// takes the kernelTemplate and populates it with the libraries
function generateKernel(_opts = {}) {
  const opts = Object.assign({}, _opts)
  const kernelCode = generateKernelCore()

  let output = kernelTemplate
  output = replaceTemplateRequire(output, 'ses', sesSrc)
  output = stringReplace(output, '__createKernelCore__', kernelCode)
  output = stringReplace(
    output,
    '__lavamoatDebugOptions__',
    JSON.stringify({ debugMode: !!opts.debugMode })
  )
  // eslint-disable-next-line no-prototype-builtins
  if (opts?.hasOwnProperty('scuttleGlobalThis')) {
    // scuttleGlobalThis config placeholder should be set only if ordered so explicitly.
    // if not, should be left as is to be replaced by a later processor (e.g. LavaPack).
    let scuttleGlobalThis = opts.scuttleGlobalThis
    if (opts.scuttleGlobalThisExceptions) {
      console.warn(
        'Lavamoat - "scuttleGlobalThisExceptions" is deprecated. Use "scuttleGlobalThis.exceptions" instead.'
      )
      if (scuttleGlobalThis === true) {
        scuttleGlobalThis = { enabled: true }
      }
    }
    const exceptions =
      scuttleGlobalThis?.exceptions || opts.scuttleGlobalThisExceptions
    scuttleGlobalThis.exceptions = exceptions
    if (exceptions) {
      // toString regexps if there's any
      for (let i = 0; i < exceptions.length; i++) {
        exceptions[i] = String(exceptions[i])
      }
    }
    output = stringReplace(
      output,
      '__lavamoatSecurityOptions__',
      JSON.stringify({
        scuttleGlobalThis,
      })
    )
  }

  return output
}

// takes the kernelCoreTemplate and populates it with the libraries
function generateKernelCore() {
  let output = kernelCoreTemplate
  output = replaceTemplateRequire(
    output,
    'endowmentsToolkit',
    endowmentsToolkitSrc
  )
  output = replaceTemplateRequire(output, 'scuttle', scuttleSrc)
  output = replaceTemplateRequire(
    output,
    'makePrepareRealmGlobalFromConfig',
    makePrepareRealmGlobalFromConfigSrc
  )
  output = replaceTemplateRequire(
    output,
    'strict-scope-terminator',
    strictScopeTerminatorSrc
  )
  return output
}

function replaceTemplateRequire(code, moduleName, src) {
  const wrappedSrc = wrapWithReturnCjsExports(moduleName, src)
  code = stringReplace(code, `templateRequire('${moduleName}')`, wrappedSrc)
  return code
}

// this wraps the content of a commonjs module with an IIFE that returns the module.exports
function wrapWithReturnCjsExports(label, src) {
  if (String(label).includes('\n')) {
    throw new Error(
      'Lavamoat - "wrapWithReturnCjsExports" does not allow labels with newlines'
    )
  }
  return `// define ${label}
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
}

// String.prototype.replace has special behavior for some characters, so we use split join instead
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
function stringReplace(src, target, replacement) {
  return src.split(target).join(replacement)
}
