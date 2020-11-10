const convertSourceMap = require('convert-source-map')
const offsetSourcemapLines = require('offset-sourcemap-lines')

module.exports = { wrapIntoModuleInitializer }

function wrapIntoModuleInitializer (source) {
  // extract sourcemaps
  const sourceMeta = extractSourceMaps(source)
  // create wrapper + update sourcemaps
  const newSourceMeta = transformToWrapped(sourceMeta)
  return newSourceMeta
}

function extractSourceMaps (sourceCode) {
  const converter = convertSourceMap.fromSource(sourceCode)
  // if (!converter) throw new Error('Unable to find original inlined sourcemap')
  const maps = converter && converter.toObject()
  const code = convertSourceMap.removeComments(sourceCode)
  return { code, maps }
}

function transformToWrapped (sourceMeta) {
  // create the wrapper around the module content
  // 1. create new global obj
  // 2. copy properties from actual endowments and global
  // see https://github.com/Agoric/SES/issues/123
  // 3. return a moduleInitializer fn
  const filename = String(sourceMeta.file)
  if (filename.includes('\n')) {
    throw new Error('LavaMoat - encountered a filename containing a newline')
  }
  const moduleWrapperSource =

`(${function () {
  // source: ${filename}
  return function (require, module, exports) {
__MODULE_CONTENT__
  }
}}).call(this)`

  const [start, end] = moduleWrapperSource.split('__MODULE_CONTENT__')
  const offsetLinesCount = start.match(/\n/g).length
  const maps = sourceMeta.maps && offsetSourcemapLines(sourceMeta.maps, offsetLinesCount)
  const code = `${start}${sourceMeta.code}${end}`
  const newSourceMeta = { code, maps }
  return newSourceMeta
}
