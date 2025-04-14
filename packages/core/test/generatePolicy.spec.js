/* eslint-disable no-undef, @typescript-eslint/no-unused-vars, no-unused-expressions, no-extend-native */
const { EOL } = require('node:os')
const test = require('ava')
const { createModuleInspector } = require('../src/generatePolicy')

const { createPolicyForTest, generatePolicyFromFiles } = require('./util')

test('basic policy', async (t) => {
  const policy = await createPolicyForTest(function () {
    location.href
  })

  t.deepEqual(
    policy,
    {
      resources: {
        test: {
          globals: {
            'location.href': true,
          },
        },
      },
    },
    'policy matched expected'
  )
})

test('policy with debugInfo', async (t) => {
  const policy = await createPolicyForTest(
    function () {
      location.href
    },
    { includeDebugInfo: true }
  )

  const testModuleFile = './node_modules/test/index.js'
  const testPackagePolicyDebugInfo = policy.debugInfo[testModuleFile]

  t.deepEqual(
    testPackagePolicyDebugInfo,
    {
      moduleRecord: {
        specifier: testModuleFile,
        file: testModuleFile,
        type: 'js',
        isRoot: false,
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
    'policy matched expected'
  )
})

test('ignore various refs', async (t) => {
  const policy = await createPolicyForTest(function () {
    const js = [this]
    const ignored = [global, require, module, exports, arguments]
    const globalRefs = [typeof globalThis, typeof self, typeof window]
    const xyz = nonIgnoredGlobal
  })

  t.deepEqual(
    policy,
    {
      resources: {
        test: {
          globals: {
            nonIgnoredGlobal: true,
          },
        },
      },
    },
    'policy matched expected'
  )
})

test('policy ignores global refs', async (t) => {
  const policy = await createPolicyForTest(function () {
    const href = window.location.href
    const xhr = new window.XMLHttpRequest()
  })

  t.deepEqual(
    policy,
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
    'policy matches expected'
  )
})

test('policy ignores global refs when properties are not accessed', async (t) => {
  const policy = await createPolicyForTest(function () {
    typeof window !== 'undefined'
  })

  t.deepEqual(policy, { resources: {} }, 'policy matches expected')
})

test('policy ignores global refs accessed with whitelist items', async (t) => {
  const policy = await createPolicyForTest(function () {
    window.Object === Object
  })

  t.deepEqual(policy, { resources: {} }, 'policy matches expected')
})

test('policy ignores newer intrinsics', async (t) => {
  const policy = await createPolicyForTest(function () {
    BigInt(123)
  })

  t.deepEqual(policy, { resources: {} }, 'policy matches expected')
})

test('CJS should flag import/export as global', async (t) => {
  const policy = await createPolicyForTest(function () {
    globalThis.import
    globalThis.export
    require('node:util')
  })

  t.deepEqual(
    policy,
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
    'policy matches expected'
  )
})

test('ESM should flag require/module/exports as global', async (t) => {
  const policy = await createPolicyForTest(`
  require('node:util');
  let e = exports
  let m = module.exports
  export const foo = 'bar';
`)

  t.deepEqual(
    policy,
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
    'policy matches expected'
  )
})

test('trusted root - does not create `root` top-level field', async (t) => {
  const policy = await createPolicyForTest(`console.log('hello world')`, {
    inspector: createModuleInspector({
      isBuiltin: () => false,
      includeDebugInfo: false,
      trustRoot: true,
    }),
  })

  t.deepEqual(policy, {
    resources: {
      test: {
        globals: {
          'console.log': true,
        },
      },
    },
  })
})

test('untrusted root - creates a `root` top-level field referencing a resource', async (t) => {
  const policy = await createPolicyForTest(`console.log('hello world')`, {
    inspector: createModuleInspector({
      isBuiltin: () => false,
      includeDebugInfo: false,
      trustRoot: false,
    }),
  })

  t.deepEqual(policy, {
    root: {
      usePolicy: '$root$',
    },
    resources: {
      $root$: {
        packages: {
          test: true,
        },
      },
      test: {
        globals: {
          'console.log': true,
        },
      },
    },
  })
})

test('unsupported extensionless file', async (t) => {
  await t.throwsAsync(
    generatePolicyFromFiles({
      files: [
        {
          type: 'js',
          specifier: './entry.js',
          file: './entry.js',
          packageName: '$root$',
          importMap: {
            test: './node_modules/test/index',
          },
          content: 'require("test")',
          entry: true,
        },
        {
          // non-entry
          type: 'js',
          specifier: './node_modules/test/index',
          file: './node_modules/test/index',
          packageName: 'test',
          importMap: {},
          content: '<anarchist cookbook>',
        },
      ],
    }),
    {
      message: `LavaMoat - failed to parse extensionless file of unknown format: ./node_modules/test/index`,
    }
  )
})
