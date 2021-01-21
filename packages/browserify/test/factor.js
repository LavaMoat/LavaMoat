const test = require('ava')
const createCustomPack = require('../src/createCustomPack')
const {
  createBrowserifyFromRequiresArray,
  createBundleForScenario,
  runBrowserify,
  getStreamResults,
  evalBundle,
  runScenario
} = require('./util')

const {
  fillInFileDetails,
  autoConfigForScenario
} = require('lavamoat-core/test/util')

test('package factor bundle', async (t) => {
  const scenario = {
    files: fillInFileDetails({
      './node_modules/b/index.js': {
        // common.js
        packageName: 'b',
        file: './node_modules/b/index.js',
        importMap: {},
        content: 'module.exports = global.three'
      },
      './src/12.js': {
        packageName: '<root>',
        imortMap: {},
        content: 'module.exports = 10'
      },
      './src/1.js': {
        // src/1.js
        packageName: '<root>',
        importMap: {
          2: './node_modules/a/index.js',
          3: './node_modules/b/index.js',
          10: './src/10.js'
        },
        content: 'const testResult = require(\'2\') * require(\'3\') * require(\'10\'); console.log(JSON.stringify(testResult, null, 2))',
        entry: true
      },
      './src/10.js': {
        packageName: '<root>',
        importMap: {
          12: './src/12.js'
        },
        content: 'module.exports = require(\'12\')'
      },
      './node_modules/a/index.js': {
        packageName: 'a',
        importMap: {},
        content: 'module.exports = global.two'
      },
      './src/2.js': {
        // src/2.js
        packageName: '<root>',
        importMap: {
          3: './node_modules/b/index.js',
          4: './node_modules/c/index.js',
          11: './src/11.js',
        },
        content: 'const testResult = require(\'3\') * require(\'4\') * require(\'11\'); console.log(JSON.stringify(testResult, null, 2))',
        entry: true
      },
      './src/11.js': {
        packageName: '<root>',
        importMap: {
          12: './src/12.js'
        },
        content: 'module.exports = require(\'12\')'
      },
      './node_modules/c/index.js': {
        packageName: 'c',
        importMap: {},
        content: 'module.exports = global.four'
      }
    }),
    entries: ['./src/1.js', './src/2.js'],
    opts: {
      pruneConfig: true
    },
    context: {
      two: 2,
      three: 3,
      four: 4,
    },
    createPacker
  }
  await autoConfigForScenario({ scenario })
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
  const bundle = createBundleForScenario({ scenario })
  const vinylBundles = await getStreamResults(bundle)
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

  const testResult1 = runScenario({ scenario, bundle: bundles['common.js'] + bundles['src/1.js'] })
  const testResult2 = runScenario({ scenario, bundle: bundles['common.js'] + bundles['src/2.js'] })

  t.is(testResult1, 60)
  t.is(testResult2, 120)
})
