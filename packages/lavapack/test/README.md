# Testing the Source Map Wrapper

The following code was moved from `lavamoat-browserify` to `@lavamoat/lavapack`. It is not functional, but provides an example of how to test the source map wrapper.

> TODO: Make this work

```js
/* eslint-disable ava/no-skip-test, no-undef, n/no-missing-require */
// to be migrated into lavapack from lavamoat-browserify

const test = require('ava')
const UglifyJS = require('uglify-js')
const { SourceMapConsumer } = require('source-map')

test('sourcemaps - adjust maps for wrapper', async (t) => {
  const { wrapIntoModuleInitializer } = require('../src/sourcemaps')
  const fooSource = `
var two = 1 + 1
throw new Error('Boom')
var three = two + 1
`
  // eslint-disable-next-line no-undef
  const result = UglifyJS.minify(
    { './foo.js': fooSource },
    {
      // skip logical compression like removing unused stuff
      compress: false,
      sourceMap: {
        filename: './foo.js',
        // inline sourcemaps with sources included
        url: 'inline',
        includeSources: true,
      },
    }
  )
  if (result.error) {
    t.ifError(result.error)
  }
  // ensure minification worked
  t.true(indicesOf('\n', fooSource).length > 1)
  t.is(indicesOf('\n', result.code).length, 1)
  // wrap into bundle with external sourcemaps
  const wrappedSourceMeta = wrapIntoModuleInitializer(result.code)
  await validateSourcemaps(t, wrappedSourceMeta)
})

function indicesOf(substring, string) {
  const result = []
  let index = -1
  while ((index = string.indexOf(substring, index + 1)) >= 0) {
    result.push(index)
  }
  return result
}

// this is not perfecct - just a heuristic
async function validateSourcemaps(t, sourceMeta) {
  const targetSlug = 'new Error'
  // eslint-disable-next-line no-undef
  const consumer = await new SourceMapConsumer(sourceMeta.maps)
  t.true(consumer.hasContentsOfAllSources(), 'has the contents of all sources')

  const sourceLines = sourceMeta.code.split('\n')

  sourceLines
    .map((line) => indicesOf(targetSlug, line))
    .forEach((errorIndices, lineIndex) => {
      // if (errorIndex === null) return console.log('line does not contain "new Error"')
      errorIndices.forEach((errorIndex) => {
        const position = { line: lineIndex + 1, column: errorIndex }
        const result = consumer.originalPositionFor(position)
        if (!result.source) {
          t.fail(`missing source for position: ${JSON.stringify(position)}`)
          t.log('=======')
          t.log(contentForPosition(sourceLines, position))
          t.log('=======')
          return
        }
        const sourceContent = consumer.sourceContentFor(result.source)
        const sourceLines = sourceContent.split('\n')
        const line = sourceLines[result.line - 1]
        if (!line.includes(targetSlug)) {
          t.fail(`could not find target "${targetSlug}" in source`)
        }
      })
    })
  t.true(true, 'sourcemaps look ok')
}

function contentForPosition(sourceLines, position) {
  return sourceLines[position.line - 1].slice(position.column)
}
```
