const test = require('ava')
// eslint-disable-next-line ava/no-import-test-files
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const webpackConfigDefault = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = { ...webpackConfigDefault }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
  t.context.bundle = t.context.build.snapshot['/dist/app.js']
})

test('webpack/main - dist shape', (t) => {
  t.snapshot(Object.keys(t.context.build.snapshot))
})

test('webpack/main - default warning gets printed', (t) => {
  t.regex(t.context.build.stdout, /Concatenation of modules disabled/)
})

test('webpack/main - warns about excluded modules', (t) => {
  t.regex(
    t.context.build.stdout,
    /WARNING.*excluded modules.*src\/style\.css.*side-effects-package\/styles\.css/s
  ) // `s` for multiline matching
})

test('webpack/main - bundle runs without throwing', (t) => {
  t.notThrows(() => {
    runScriptWithSES(t.context.bundle)
  })
})

test('webpack/main - bundle contains the lavamoat wrapping', (t) => {
  t.regex(t.context.bundle, /with\s?\(/)
  t.regex(t.context.bundle, /_LM_/)
})

test('webpack/main - modules were included', (t) => {
  // assert each of the modules from package.json were included
  t.regex(t.context.bundle, /commonjs-package/)
  t.regex(t.context.bundle, /es6-module-package/)
  t.regex(t.context.bundle, /side-effects-package/)
  t.regex(t.context.bundle, /typescript-package/)
  t.regex(t.context.bundle, /umd-package/)
})

test('webpack/main - treeshaking works', (t) => {
  t.assert(
    !t.context.bundle.includes('13371337'),
    'Expected treeshakeable reference to be excluded'
  )
})

test('webpack/main - css extraction works', (t) => {
  const files = Object.keys(t.context.build.snapshot)
  t.assert(
    files.includes('/dist/styles/app.css'),
    `Expected /dist/styles/app.css to be among files: ${files.join()}`
  )
  const styles = t.context.build.snapshot['/dist/styles/app.css']
  t.true(
    styles.includes('.app-main'),
    `Expected styles to include '.app-main', but got: ${styles}`
  )
  t.true(
    styles.includes('.side-effects-package'),
    `Expected styles to include '.side-effects-package', but got: ${styles}`
  )
})

test('webpack/main - html plugin works', (t) => {
  const html = t.context.build.snapshot['/dist/index.html']
  t.snapshot(html)
})
