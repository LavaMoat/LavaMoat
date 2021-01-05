const test = require('ava')
const { execSync } = require('child_process');
const path = require('path')

test('basic - bundle works under lavamoat node', async (t) => {
  const bundle = execSync("lavamoat ../../../test/fixtures/runBrowserifyWithEntry.js --applyExportsDefense false", { cwd: path.resolve(__dirname, '../examples/01-simple-js/lavamoat-build'), maxBuffer: 8192 * 10000 })
  t.assert(bundle, "Bundle exists")
})