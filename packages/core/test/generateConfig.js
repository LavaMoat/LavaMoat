/* eslint-disable no-undef, no-unused-vars, no-unused-expressions, no-extend-native */
const test = require('ava')

const { createConfigForTest } = require('./util')

test('generateConfig - basic config', async (t) => {
  const config = await createConfigForTest(function () {
    location.href
  })

  t.deepEqual(config, {
    resources: {
      test: {
        globals: {
          'location.href': true
        }
      }
    }
  }, 'config matched expected')
})

test('generateConfig - config with debugInfo', async (t) => {
  const config = await createConfigForTest(function () {
    location.href
  }, { includeDebugInfo: true })

  const testModuleFile = './node_modules/test/index.js'
  const testPackageConfigDebugInfo = config.debugInfo[testModuleFile]

  t.deepEqual(testPackageConfigDebugInfo, {
    moduleRecord: {
      specifier: testModuleFile,
      file: testModuleFile,
      type: 'js',
      content: '(function () {\n    location.href\n  })()',
      importMap: {},
      packageName: 'test',
      packageVersion: '1.2.3',
      moduleInitializer: undefined
    },
    globals: {
      'location.href': 'read'
    }
  }, 'config matched expected')
})

test('generateConfig - ignore various refs', async (t) => {
  const config = await createConfigForTest(function () {
    const js = [this]
    const ignored = [global, require, module, exports, arguments]
    const globalRefs = [typeof globalThis, typeof self, typeof window]
    const xyz = nonIgnoredGlobal
  })

  t.deepEqual(config, {
    resources: {
      test: {
        globals: {
          nonIgnoredGlobal: true
        }
      }
    }
  }, 'config matched expected')
})

test('generateConfig - config ignores global refs', async (t) => {
  const config = await createConfigForTest(function () {
    const href = window.location.href
    const xhr = new window.XMLHttpRequest()
  })

  t.deepEqual(config, {
    resources: {
      test: {
        globals: {
          'location.href': true,
          XMLHttpRequest: true
        }
      }
    }
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs when properties are not accessed', async (t) => {
  const config = await createConfigForTest(function () {
    typeof window !== 'undefined'
  })

  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})

test('generateConfig - config ignores global refs accessed with whitelist items', async (t) => {
  const config = await createConfigForTest(function () {
    window.Object === Object
  })

  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})

test('generateConfig - config ignores newer intrinsics', async (t) => {
  const config = await createConfigForTest(function () {
    BigInt(123)
  })

  t.deepEqual(config, {
    resources: {}
  }, 'config matches expected')
})

// we no longer throw an error, we log a warning
// test('generateConfig - primordial modification', async (t) => {
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
