const test = require('ava')
const { execSync } = require('child_process')
const path = require('path')
const {
  evalBundle,
} = require('./util')

test('lavamoat-node compat - bundle works under lavamoat node', (t) => {
  let bundle
  try {
    bundle = execSync('./test/fixtures/secureBundling/run.sh',
      {
        cwd: path.resolve(__dirname, '../'),
        maxBuffer: 8192 * 10000,
      })
  } catch (err) {
    // eslint-disable-next-line ava/assertion-arguments
    return t.fail(err.stderr.toString())
  }
  t.pass('bundling works under lavamoat node')
  const testResult = evalBundle(bundle.toString(), { console })
  t.is(testResult.value, 'c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470', 'bundle works as expected')
})
