const test = require('ava')
const { execSync } = require('child_process');
const path = require('path')
const {
  evalBundle,
} = require('./util')

test('basic - bundle works under lavamoat node', async (t) => {
  const bundle = execSync("lavamoat build.js --applyExportsDefense false",
  {
    cwd: path.resolve(__dirname, './fixtures/secureBundling'),
    maxBuffer: 8192 * 10000
  })
  const testResult = evalBundle(bundle.toString(), { console })
  t.is(testResult.value, "c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470")
})