/* eslint-disable no-undef, @typescript-eslint/no-unused-vars, no-unused-expressions, no-extend-native */
const { EOL } = require('node:os')
const test = require('ava')

const { createConfigForTest, generateConfigFromFiles } = require('./util')

test('generatePolicy - basic config', async (t) => {
  const config = await createConfigForTest(function () {
    location.href
  })

  t.deepEqual(
    config,
    {
      resources: {
        test: {
          globals: {
            'location.href': true,
          },
        },
      },
    },
    'config matched expected'
  )
})

test('generatePolicy - config with debugInfo', async (t) => {
  const config = await createConfigForTest(
    function () {
      location.href
    },
    { includeDebugInfo: true }
  )

  const testModuleFile = './node_modules/test/index.js'
  const testPackageConfigDebugInfo = config.debugInfo[testModuleFile]

  t.deepEqual(
    testPackageConfigDebugInfo,
    {
      moduleRecord: {
        specifier: testModuleFile,
        file: testModuleFile,
        type: 'js',
        // this is brittle
        content: `(function () {${EOL}      location.href${EOL}    })()`,
        importMap: {},
        packageName: 'test',
        moduleInitializer: undefined,
      },
      globals: {
        'location.href': 'read',
      },
    },
    'config matched expected'
  )
})

test('generatePolicy - ignore various refs', async (t) => {
  const config = await createConfigForTest(function () {
    const js = [this]
    const ignored = [global, require, module, exports, arguments]
    const globalRefs = [typeof globalThis, typeof self, typeof window]
    const xyz = nonIgnoredGlobal
  })

  t.deepEqual(
    config,
    {
      resources: {
        test: {
          globals: {
            nonIgnoredGlobal: true,
          },
        },
      },
    },
    'config matched expected'
  )
})

test('generatePolicy - config ignores global refs', async (t) => {
  const config = await createConfigForTest(function () {
    const href = window.location.href
    const xhr = new window.XMLHttpRequest()
  })

  t.deepEqual(
    config,
    {
      resources: {
        test: {
          globals: {
            'location.href': true,
            XMLHttpRequest: true,
          },
        },
      },
    },
    'config matches expected'
  )
})

test('generatePolicy - config ignores global refs when properties are not accessed', async (t) => {
  const config = await createConfigForTest(function () {
    typeof window !== 'undefined'
  })

  t.deepEqual(
    config,
    {
      resources: {},
    },
    'config matches expected'
  )
})

test('generatePolicy - config ignores global refs accessed with whitelist items', async (t) => {
  const config = await createConfigForTest(function () {
    window.Object === Object
  })

  t.deepEqual(
    config,
    {
      resources: {},
    },
    'config matches expected'
  )
})

test('generatePolicy - config ignores newer intrinsics', async (t) => {
  const config = await createConfigForTest(function () {
    BigInt(123)
  })

  t.deepEqual(
    config,
    {
      resources: {},
    },
    'config matches expected'
  )
})

test('generatePolicy - CJS should flag import/export as global', async (t) => {
  const config = await createConfigForTest(function () {
    globalThis.import
    globalThis.export
    require('node:util')
  })

  t.deepEqual(
    config,
    {
      resources: {
        test: {
          globals: {
            import: true,
            export: true,
          },
        },
      },
    },
    'config matches expected'
  )
})

test('generatePolicy - ESM should flag require/module/exports as global', async (t) => {
  const config = await createConfigForTest(`
  require('node:util');
  let e = exports
  let m = module.exports
  export const foo = 'bar';
`)

  t.deepEqual(
    config,
    {
      resources: {
        test: {
          globals: {
            require: true,
            exports: true,
            'module.exports': true,
          },
        },
      },
    },
    'config matches expected'
  )
})

// we no longer throw an error, we log a warning
// test('generatePolicy - primordial modification', async (t) => {
//   try {
//     const config = await createConfigForTest(function () {
//       const href = window.location.href
//       Array.prototype.bogosort = () => 'yolo'
//     })
//     t.fail('expected to throw an error')
//   } catch (err) {
//     t.pass()
//   }
// })
