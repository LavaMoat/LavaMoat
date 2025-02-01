import '../../src/preamble.js'

import test from 'ava'
import { createExecMacros } from './exec-macros.js'

const isDockerCI = !!process.env.DOCKER_CI

const { testExec, testExecForJSON } = createExecMacros(test)

test(
  'app without dependencies',
  testExec,
  new URL('./fixture/no-deps/app.js', import.meta.url),
  { resources: {} },
  { hello: 'world' }
)

test(
  'dynamic imports (JSON)',
  testExecForJSON,
  'dynamic.json',
  {
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
  { hello: 'hello world' }
)

test(
  'dynamic imports',
  testExec,
  new URL('./fixture/dynamic/index.js', import.meta.url),
  {
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
  { hello: 'hello world' }
)
;(isDockerCI ? test.failing : test)(
  'native module w/ dynamic imports',
  testExec,
  new URL('./fixture/native/index.js', import.meta.url),
  {
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
  { hello: 'world' }
)
;(isDockerCI ? test.failing : test)(
  'native module',
  testExec,
  new URL('./fixture/static-native/index.js', import.meta.url),
  {
    resources: {
      hello_world: {
        native: true,
        packages: {
          node_gyp_build: true,
        },
      },
    },
  },
  { hello: 'world' }
)

test.todo('dynamic import of builtin module')
