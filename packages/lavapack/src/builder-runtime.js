const { join: pathJoin } = require('path')
const { promises: { readFile, writeFile }} = require('fs')
const { generateKernel, makeInitStatsHook } = require('lavamoat-core')
const { getStrictScopeTerminatorShimSrc, replaceTemplateRequire } = require('lavamoat-core/src/generateKernel')

module.exports = buildRuntimeUMD

function markAsGenerated(output, file) {
  const runner = __filename.slice(__dirname.length + 1)
  return `// DO NOT EDIT! THIS FILE IS GENERATED FROM "${file}" BY RUNNING "${runner}"\n\n` + output
}

async function buildRuntimeCJS () {
  const runtimeCjsTemplate = await readFile(pathJoin(__dirname, 'runtime-cjs-template.js'), 'utf8')
  let output = replaceTemplateRequire(runtimeCjsTemplate, 'strict-scope-terminator', getStrictScopeTerminatorShimSrc())
  output = markAsGenerated(output, 'runtime-cjs-template.js')
  await writeFile(pathJoin(__dirname, 'runtime-cjs.js'), output)
}

async function buildRuntimeES (opts) {
  const runtimeTemplate = await readFile(pathJoin(__dirname, 'runtime-template.js'), 'utf8')
  let output = runtimeTemplate
  // inline kernel
  const kernelCode = generateKernel(opts)
  output = stringReplace(output, '__createKernel__', kernelCode)
  // inline reportStatsHook
  const statsCode = `(${makeInitStatsHook})({ onStatsReady })`
  output = stringReplace(output, '__reportStatsHook__', statsCode)
  // inline snow
  const snow = await readFile(pathJoin(__dirname, '../../../node_modules/@lavamoat/snow/snow.js'), 'utf8')
  output = replaceTemplateRequire(output, 'snow', snow)
  output = markAsGenerated(output, 'runtime-template.js')
  await writeFile(pathJoin(__dirname, 'runtime.js'), output)
}

async function buildRuntimeUMD (opts = {}) {
  await Promise.all([buildRuntimeCJS(), buildRuntimeES(opts)])
}

// String.prototype.replace has special behavior for some characters, so we use split join instead
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
function stringReplace (src, target, replacement) {
  return src.split(target).join(replacement)
}
