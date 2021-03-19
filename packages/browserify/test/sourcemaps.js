const test = require('ava')
const UglifyJS = require('uglify-js')
const { SourceMapConsumer } = require('source-map')
const { wrapIntoModuleInitializer } = require('../src/sourcemaps')

test('sourcemaps - adjust maps for wrapper', async (t) => {
  const fooSource = (`
  var two = 1 + 1
  throw new Error('Boom')
  var three = two + 1
  `)

  const result = UglifyJS.minify({ './foo.js': fooSource }, {
    // skip logical compression like removing unused stuff
    compress: false,
    sourceMap: {
      filename: './foo.js',
      // inline sourcemaps with sources included
      url: 'inline',
      includeSources: true
    }
  })

  if (result.error) t.ifError(result.error)

  // ensure minification worked
  t.true(indicesOf('\n', fooSource).length > 1)
  t.is(indicesOf('\n', result.code).length, 1)

  // wrap into bundle with external sourcemaps
  const wrappedSourceMeta = wrapIntoModuleInitializer(result.code)
  await validateSourcemaps(t, wrappedSourceMeta)

  })

function indicesOf (substring, string) {
  const result = []
  let index = -1
  while ((index = string.indexOf(substring, index + 1)) >= 0) result.push(index)
  return result
}

// this is not perfecct - just a heuristic
async function validateSourcemaps (t, sourceMeta) {
  const targetSlug = 'new Error'
  const consumer = await new SourceMapConsumer(sourceMeta.maps)
  t.true(consumer.hasContentsOfAllSources(), 'has the contents of all sources')

  const sourceLines = sourceMeta.code.split('\n')

  sourceLines
    .map(line => indicesOf(targetSlug, line))
    .forEach((errorIndices, lineIndex) => {
    // if (errorIndex === null) return console.log('line does not contain "new Error"')
      errorIndices.forEach((errorIndex) => {
        const position = { line: lineIndex + 1, column: errorIndex }
        const result = consumer.originalPositionFor(position)
        if (!result.source) {
          t.fail(`missing source for position: ${JSON.stringify(position)}`)
          console.warn('=======')
          console.warn(contentForPosition(sourceLines, position))
          console.warn('=======')
          return
        }
        const sourceContent = consumer.sourceContentFor(result.source)
        const sourceLines = sourceContent.split('\n')
        const line = sourceLines[result.line - 1]
        if (!line.includes(targetSlug)) t.fail(`could not find target "${targetSlug}" in source`)
      })
    })
  t.true(true, 'sourcemaps look ok')
}

function contentForPosition (sourceLines, position) {
  return sourceLines[position.line - 1].slice(position.column)
}
