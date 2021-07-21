const { join: pathJoin } = require('path')
const { promises: { readFile, writeFile } } = require('fs')
const { generateKernel } = require('lavamoat-core')

start().catch(err => {
  console.error(err)
  process.exit(1)
})

async function start () {
  const runtimeTemplate = await readFile(pathJoin(__dirname, 'runtime-template.js'), 'utf8')
  const kernelCode = generateKernel()
  const output = stringReplace(runtimeTemplate, '__createKernel__', kernelCode)
  await writeFile(pathJoin(__dirname, 'runtime.js'), output)
}

// String.prototype.replace has special behavior for some characters, so we use split join instead
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
function stringReplace (src, target, replacement) {
  return src.split(target).join(replacement)
}
