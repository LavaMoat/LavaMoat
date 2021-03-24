const test = require('ava')
const { execSync } = require('child_process');
const path = require('path')
const {
  evalBundle,
} = require('./util')

test('basic - bundle works under lavamoat node', (t) => {
  let bundle
  try {
    bundle = execSync("lavamoat build.js",
    {
      cwd: path.resolve(__dirname, './fixtures/secureBundling'),
      maxBuffer: 8192 * 10000
    })
  } catch (err) {
    console.error(`stdout:\n${err.stdout.toString()}`)
    console.error(`stderr:\n${err.stderr.toString()}`)
    throw err
  }
  const testResult = evalBundle(bundle.toString(), { console })
  t.is(testResult.value, "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
})