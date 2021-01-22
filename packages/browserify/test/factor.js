const test = require('ava')
const {
  createBundleForScenario,
  runScenario
} = require('./util')

const fs = require('fs')
const {
  fillInFileDetails,
  autoConfigForScenario,
  functionToString
} = require('lavamoat-core/test/util')

test('package factor bundle', async (t) => {
  const scenario = {
    files: fillInFileDetails({
      './node_modules/b/index.js': {
        // common.js
        packageName: 'b',
        file: './node_modules/b/index.js',
        importMap: {},
        content: functionToString(() => {
          module.exports = global.three
        })
      },
      './src/12.js': {
        packageName: '<root>',
        importMap: {},
        content: functionToString(() => {
          module.exports = 10
        })
      },
      './src/1.js': {
        // src/1.js
        packageName: '<root>',
        importMap: {
          a: './node_modules/a/index.js',
          b: './node_modules/b/index.js',
          './10': './src/10.js'
        },
        content: functionToString(() => {
          const testResult = require('a') * require('b') * require('./10')
          console.log(JSON.stringify(testResult, null, 2))
        }),
        entry: true
      },
      './src/10.js': {
        packageName: '<root>',
        importMap: {
          './12': './src/12.js'
        },
        content: functionToString(() => {
          module.exports = require('./12')
        })
      },
      './node_modules/a/index.js': {
        packageName: 'a',
        importMap: {},
        content: functionToString(() => {
          module.exports = global.two
        })
      },
      './src/2.js': {
        // src/2.js
        packageName: '<root>',
        importMap: {
          b: './node_modules/b/index.js',
          c: './node_modules/c/index.js',
          './11': './src/11.js',
        },
        content: functionToString(() => {
          const testResult = require('b') * require('c') * require('./11')
          console.log(JSON.stringify(testResult, null, 2))
        }),
        entry: true
      },
      './src/11.js': {
        packageName: '<root>',
        importMap: {
          './12': './src/12.js'
        },
        content: functionToString(() => {
          module.exports = require('./12')
        })
      },
      './node_modules/c/index.js': {
        packageName: 'c',
        importMap: {},
        content: functionToString(() => {
          module.exports = global.four
        })
      }
    }),
    entries: ['./src/1.js', './src/2.js'],
    config: {
      resources: {
        c: {
          globals: {
            four: true
          }
        },
        a: {
          globals: {
            two: true
          }
        },
        b: {
          globals: {
            three: true
          }
        }
      }
    },
    opts: {
      // breaks when enabled (for some reason)
      // pruneConfig: true
    },
    context: {
      two: 2,
      three: 3,
      four: 4,
    },
    type: 'factor'
  }

  const { bundleForScenario: rawOutput } = await createBundleForScenario({ scenario })
  const vinylBundles = JSON.parse(rawOutput)

  const relativeNames = Object.keys(vinylBundles).sort()
  t.deepEqual(relativeNames, [
    'common.js',
    'src/1.js',
    'src/2.js'
  ], 'relative filenames are as expected')

  const testResult1 = await runScenario({ scenario, bundle: vinylBundles['common.js'] + vinylBundles['src/1.js'] })
  const testResult2 = await runScenario({ scenario, bundle: vinylBundles['common.js'] + vinylBundles['src/2.js'] })

  t.is(testResult1, 60)
  t.is(testResult2, 120)
})
