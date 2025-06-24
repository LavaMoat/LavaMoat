import '../../../src/preamble.js'

import test from 'ava'
import { run } from '../../../src/exec/run.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from '../json-fixture-util.js'
import { createExecMacros } from './exec-macros.js'

const { testExec, testExecForJSON } = createExecMacros(test)

test(
  'app without dependencies',
  testExec,
  new URL('../fixture/no-deps/app.js', import.meta.url),
  { hello: 'world' }
)

test(
  'dynamic require (JSON)',
  testExecForJSON,
  'dynamic.json',
  { hello: 'hello world' },
  {
    policy: {
      resources: {
        'dynamic-require': {
          packages: {
            dummy: true,
          },
        },
        dummy: {
          packages: {
            muddy: true,
          },
        },
      },
    },
  }
)

test(
  'bin script entrypoint',
  testExecForJSON,
  'bin-entry.json',
  { default: {} },
  { jsonEntrypoint: '/node_modules/.bin/lard-o-matic' }
)

test('hashbang evasion', testExecForJSON, 'hashbang.json', {
  default: { hello: 'world' },
  hello: 'world',
})

test('policy enforcement - untrusted root', async (t) => {
  const { readPowers } = await loadJSONFixture(
    new URL('policy-enforcement.json', JSON_FIXTURE_DIR_URL)
  )
  await t.throwsAsync(
    run(
      '/node_modules/app/app.js',

      {
        policy: {
          resources: {
            app: {
              packages: {
                pid: true,
              },
            },
            pid: {
              globals: {
                'process.pid': false,
              },
            },
          },
          root: {
            usePolicy: 'app',
          },
        },
        readPowers,
        trustRoot: false,
      }
    ),
    {
      message: `Cannot read properties of undefined (reading 'pid')`,
    }
  )
})

test(
  'dynamic require of a node:-namespaced builtin module',
  testExecForJSON,
  'dynamic-builtin.json',
  { hello: 'hello world' },
  {
    policy: {
      resources: {
        'dynamic-require': {
          builtin: { 'node:fs': true },
        },
      },
    },
  }
)

test(
  'native module w/ dynamic imports',
  testExec,
  new URL('../fixture/native/index.js', import.meta.url),
  { hello: 'world' },
  {
    policy: {
      resources: {
        hello_world: {
          packages: {
            'node-gyp-build': true,
          },
          globals: {
            __dirname: true,
          },
          native: true,
        },
        'hello_world>node-gyp-build': {
          globals: {
            __webpack_require__: true,
            __non_webpack_require__: true,
            process: true,
          },
          builtin: {
            'fs.existsSync': true,
            'fs.readdirSync': true,
            'os.arch': true,
            'os.platform': true,
            'path.dirname': true,
            'path.join': true,
            'path.resolve': true,
          },
        },
      },
    },
  }
)
;(process.platform === 'linux' && process.arch === 'x64' ? test : test.skip)(
  'native module loaded statically (linux-x64 only)',
  testExec,
  new URL('../fixture/static-native/index.js', import.meta.url),
  { hello: 'world' },
  {
    policy: {
      resources: {
        hello_world: {
          native: true,
          packages: {
            node_gyp_build: true,
          },
        },
      },
    },
  }
)

test.todo('hashbang in module')

test(
  'do not fail if missing optional dependencies',
  testExec,
  new URL('../fixture/optional/node_modules/app/index.js', import.meta.url),
  { value: 'hello world', default: { value: 'hello world' } },
  {}
)
