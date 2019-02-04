const test = require('tape')
const UglifyJS = require('uglify-js')
const convertSourceMap = require('convert-source-map')
const offsetSourcemapLines = require('offset-sourcemap-lines')
const { SourceMapConsumer } = require('source-map')


test('sourcemaps - adjust maps for wrapper', async (t) => {
  const fooSource = (`
  var two = 1 + 1
  throw new Error('Boom')
  var three = two + 1
  `)

  const result = UglifyJS.minify({ './foo.js': fooSource }, {
    compress: false,
    sourceMap: {
      filename: './foo.js',
      url: 'inline',
      includeSources: true,
    }
  })

  if (result.error) t.ifError(result.error)

  // ensure minification worked
  t.ok(indicesOf('\n', fooSource).length > 1)
  t.equal(indicesOf('\n', result.code).length, 1)

  // wrap into bundle with external sourcemaps
  const wrappedBundle = wrapIntoBundle(result.code)
  await validateBundleSourcemaps(t, wrappedBundle)

  t.end()
})

function wrapIntoBundle (source) {
  // extract sourcemaps
  const sourceBundle = extractSourceMaps(source)
  // create wrapper + update sourcemaps
  const transformedBundle = transformToWrapped(sourceBundle)
  return transformedBundle
}

function extractSourceMaps (sourceCode) {
  const converter = convertSourceMap.fromSource(sourceCode)
  if (!converter) throw new Error('Unable to find original inlined sourcemap')
  const maps = converter.toObject()
  const code = convertSourceMap.removeComments(sourceCode)
  return { code, maps }
}

function transformToWrapped (bundle) {
  const start = '(function(require,module,exports){\n'
  const end = '\n})'

  const offsetLinesCount = start.match(/\n/g).length
  const maps = offsetSourcemapLines(bundle.maps, offsetLinesCount)
  const code = start + bundle.code + end
    
  return { code, maps }
}

function indicesOf (substring, string) {
  const result = []
  let index = -1
  while ((index = string.indexOf(substring, index + 1)) >= 0) result.push(index)
  return result
}

// this is not perfecct - just a heuristic
async function validateBundleSourcemaps (t, bundle) {
  const targetSlug = 'new Error'
  const consumer = await new SourceMapConsumer(bundle.maps)
  t.ok(consumer.hasContentsOfAllSources(), 'has the contents of all sources')

  const sourceLines = bundle.code.split('\n')
  sourceLines.map(line => indicesOf(targetSlug, line))
  .forEach((errorIndices, lineIndex) => {
    // if (errorIndex === null) return console.log('line does not contain "new Error"')
    errorIndices.forEach((errorIndex) => {
      const position = { line: lineIndex + 1, column: errorIndex }
      const result = consumer.originalPositionFor(position)
      if (!result.source) return t.fail(`missing source for position: ${position}`)
      const sourceContent = consumer.sourceContentFor(result.source)
      const sourceLines = sourceContent.split('\n')
      const line = sourceLines[result.line - 1]
      if (!line.includes(targetSlug)) t.fail(`could not find target "${targetSlug}" in source`)
    })
  })
  t.ok(true, 'sourcemaps look ok')
}
