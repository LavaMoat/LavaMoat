const test = require('ava')
const createCustomPack = require('../src/createCustomPack')
const {
  generateConfigFromFiles,
  createBrowserifyFromRequiresArray,
  getStreamResults,
  evalBundle,
} = require('./util')

test('package factor bundle', async (t) => {
  const files = [{
    // common.js
    id: '3',
    packageName: 'b',
    file: './node_modules/b/index.js',
    deps: {},
    source: 'module.exports = global.three'
  }, {
    id: '12',
    packageName: '<root>',
    file: './src/12.js',
    deps: {},
    source: 'module.exports = 10'
  }, {
    // src/1.js
    id: 'entry1',
    packageName: '<root>',
    file: './src/1.js',
    deps: {
      2: './node_modules/a/index.js',
      3: './node_modules/b/index.js',
      10: './src/10.js'
    },
    source: 'global.testResult = require(\'2\') * require(\'3\') * require(\'10\')',
    entry: true
  }, {
    id: '10',
    packageName: '<root>',
    file: './src/10.js',
    deps: {
      12: './src/12.js'
    },
    source: 'module.exports = require(\'12\')'
  }, {
    id: '2',
    packageName: 'a',
    file: './node_modules/a/index.js',
    deps: {},
    source: 'module.exports = global.two'
  }, {
    // src/2.js
    id: 'entry2',
    packageName: '<root>',
    file: './src/2.js',
    deps: {
      3: './node_modules/b/index.js',
      4: './node_modules/c/index.js',
      11: './src/11.js',
    },
    source: 'global.testResult = require(\'3\') * require(\'4\') * require(\'11\')',
    entry: true
  }, {
    id: '11',
    packageName: '<root>',
    file: './src/11.js',
    deps: {
      12: './src/12.js'
    },
    source: 'module.exports = require(\'12\')'
  }, {
    id: '4',
    packageName: 'c',
    file: './node_modules/c/index.js',
    deps: {},
    source: 'module.exports = global.four'
  }]

  const config = await generateConfigFromFiles({ files })

  const bundler = createBrowserifyFromRequiresArray({ files, pluginOpts: { config, pruneConfig: true } })
    .plugin('bify-package-factor', { createPacker })

  function createPacker (opts) {
    return createCustomPack({
      ...opts,
      // omit prelude (still included in common bundle)
      includePrelude: false,
      // provide full bundle config
      config,
      // tell packer to automatically prune config
      pruneConfig: true
    })
  }

  const vinylBundles = await getStreamResults(bundler.bundle())
  t.is(vinylBundles.length, 3)


  const relativeNames = vinylBundles.map(bundleFile => bundleFile.relative).sort()
  t.deepEqual(relativeNames, [
    'common.js',
    'src/1.js',
    'src/2.js'
  ], 'relative filenames are as expected')

  const bundles = {}
  await Promise.all(vinylBundles.map(async bundleFile => {
    const { relative } = bundleFile
    const contentBuffers = await getStreamResults(bundleFile.contents)
    const content = contentBuffers.map(buffer => buffer.toString('utf8')).join('')
    bundles[relative] = content
  }))

  const testGlobal = {
    two: 2,
    three: 3,
    four: 4,
  }

  let result

  result = evalBundle(bundles['common.js'] + bundles['src/1.js'], testGlobal)
  t.is(result, 60)

  result = evalBundle(bundles['common.js'] + bundles['src/2.js'], testGlobal)
  t.is(result, 120)
})
