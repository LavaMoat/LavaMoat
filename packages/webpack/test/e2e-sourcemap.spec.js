const test = /** @type {import('ava').TestFn} */ (require('ava'))
const path = require('node:path')
const fs = require('node:fs')
const { SourceMapConsumer } = require('source-map-js')
const { scaffold } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig({
    generatePolicy: false,
  })
  // Toggle to include and exclude minification
  webpackConfig.mode = 'production'
  webpackConfig.entry = { app: './sourcemap.js' }
  webpackConfig.devtool = 'source-map'

  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.mode = webpackConfig.mode
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
  t.context.mapJson = JSON.parse(t.context.build.snapshot['/dist/app.js.map'])
})

test('webpack/sourcemap - .map file exists and is valid', (t) => {
  t.truthy(t.context.build.snapshot['/dist/app.js.map'])
  t.truthy(t.context.mapJson.version)
  t.truthy(t.context.mapJson.mappings)
  t.truthy(t.context.mapJson.sources.length > 0)
})

test('webpack/sourcemap - bundle references the sourcemap', (t) => {
  t.regex(t.context.bundle, /\/\/# sourceMappingURL=app\.js\.map/)
})

test('webpack/sourcemap - SES transforms were applied in the bundle', (t) => {
  // eval( → (0,eval)(
  t.regex(t.context.bundle, /\(0,eval\)/)
})

test('webpack/sourcemap - production mangled identifiers away from bundle but map has them', (t) => {
  if (t.context.mode === 'production') {
    // These identifiers should not survive production minification
    t.notRegex(t.context.bundle, /secretEvalResult/)
    t.notRegex(t.context.bundle, /computeSomethingUnique/)
  }
  const allContent = t.context.mapJson.sourcesContent.join('\n')

  t.regex(allContent, /secretEvalResult/)
  t.regex(allContent, /computeSomethingUnique/)
})

test('webpack/sourcemap - sourcesContent has pre-transform code', (t) => {
  const allContent = t.context.mapJson.sourcesContent.join('\n')

  // The original eval( should appear in sourcesContent, not the transformed (0,eval)(
  t.regex(allContent, /const secretEvalResult = eval\(/)
})

test('webpack/sourcemap - eval transform maps back to original position', (t) => {
  const consumer = new SourceMapConsumer(t.context.mapJson)

  // Read the fixture source to find eval position dynamically
  const fixturePath = path.join(__dirname, 'fixtures', 'main', 'sourcemap.js')
  const fixtureSource = fs.readFileSync(fixturePath, 'utf8')
  const fixtureLines = fixtureSource.split('\n')
  const { line: expectedLine, column: expectedColumn } = findInSource(
    fixtureLines,
    'eval('
  )
  t.not(expectedLine, -1, 'eval( should exist in the fixture source')

  // Verify our detected position is correct by checking the file contents
  t.is(
    fixtureLines[expectedLine - 1].slice(expectedColumn, expectedColumn + 5),
    'eval(',
    'sanity check: detected position should point at eval('
  )

  // Find (0,eval) in the generated bundle
  const bundleLines = t.context.bundle.split('\n')
  const { line: genLine, column: genColumn } = findInSource(
    bundleLines,
    '(0,eval)'
  )
  t.not(genLine, -1, '(0,eval) should exist in the bundle')

  // use sourcemap to convert to original position
  const original = consumer.originalPositionFor({
    line: genLine,
    column: genColumn,
  })

  t.log('source positions', {
    original: { line: expectedLine, column: expectedColumn },
    generated: { line: genLine, column: genColumn },
    retrieved: { line: original.line, column: original.column },
  })

  t.truthy(original.source, 'should map to a source file')
  t.regex(original.source, /sourcemap\.js/, 'should map back to sourcemap.js')
  t.is(
    original.line,
    expectedLine,
    'should map to the original line containing eval'
  )

  // Column may not be exact after terser sourcemap composition, but should be
  // on the same statement — verify the rest of the line from the mapped column
  // still contains eval(
  const restOfLine = fixtureLines[original.line - 1].slice(original.column)
  t.regex(
    restOfLine,
    /eval\(/,
    'from the mapped column onwards, the source should contain eval('
  )
})

/**
 * Find the first occurrence of a substring in an array of lines. Returns
 * 1-based line and 0-based column, or {line: -1, column: -1} if not found.
 */
function findInSource(lines, needle) {
  for (let i = 0; i < lines.length; i++) {
    const col = lines[i].indexOf(needle)
    if (col !== -1) {
      return { line: i + 1, column: col }
    }
  }
  return { line: -1, column: -1 }
}
