const { join: pathJoin } = require('path')
const { promises: { readFile, writeFile } } = require('fs')
const { generateKernel, makeInitStatsHook } = require('lavamoat-core')

module.exports = start

process.argv[2] === 'build' && start().catch(err => {
  console.error(err)
  process.exit(1)
})

async function start (opts = {}) {
  const runtimeTemplate = await readFile(pathJoin(__dirname, 'runtime-template.js'), 'utf8')
  let output = runtimeTemplate
  // inline kernel
  const kernelCode = generateKernel(opts)
  output = stringReplace(output, '__createKernel__', kernelCode)
  // inline reportStatsHook
  const statsCode = `(${makeInitStatsHook})({ onStatsReady })`
  output = stringReplace(output, '__reportStatsHook__', statsCode)
  await writeFile(pathJoin(__dirname, 'runtime.js'), output)
}

// String.prototype.replace has special behavior for some characters, so we use split join instead
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
function stringReplace (src, target, replacement) {
  return src.split(target).join(replacement)
}
