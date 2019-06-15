const convertSourceMap = require('convert-source-map')
const offsetSourcemapLines = require('offset-sourcemap-lines')

module.exports = { wrapIntoBundle }

function wrapIntoBundle (source) {
  // extract sourcemaps
  const sourceBundle = extractSourceMaps(source)
  // create wrapper + update sourcemaps
  const transformedBundle = transformToWrapped(sourceBundle)
  return transformedBundle
}

function extractSourceMaps (sourceCode) {
  const converter = convertSourceMap.fromSource(sourceCode)
  // if (!converter) throw new Error('Unable to find original inlined sourcemap')
  const maps = converter && converter.toObject()
  const sourceContent = maps && maps.sourcesContent[0]
  const code = convertSourceMap.removeComments(sourceCode)
  return { code, maps }
}

function transformToWrapped (bundle) {
  const setupGlobalRef = [
    // create new global obj
    'const self = {}, window = self;',
    // copy properties from actual endowments and global
    // see https://github.com/Agoric/SES/issues/123
    'try {',
    '  Object.defineProperties(self, Object.getOwnPropertyDescriptors(_endowments));',
    '  Object.defineProperties(self, Object.getOwnPropertyDescriptors(this));',
    '} catch (err) {',
    '  console.warn(`Sesify - Error performing globalRef setup:`, err.message)',
    '  throw err',
    '}',
  ].join('\n')
  const start = `${setupGlobalRef}\n(function(require,module,exports){\n`
  const end = '\n})'

  const offsetLinesCount = start.match(/\n/g).length
  const maps = bundle.maps && offsetSourcemapLines(bundle.maps, offsetLinesCount)
  const code = start + bundle.code + end

  return { code, maps }
}
