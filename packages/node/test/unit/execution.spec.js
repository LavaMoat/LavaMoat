import '../../src/preamble.js'

import test from 'ava'
import { run } from '../../src/exec/run.js'

const isDockerCI = !!process.env.DOCKER_CI

/**
 * Unique index for generic test titles (to avoid test title collisions)
 */
let genericTitleIndex = 0

/**
 * @import {MacroDeclarationOptions} from 'ava'
 * @import {LavaMoatPolicy} from '@lavamoat/types';
 */

const testExec = test.macro(
  /**
   * @type {MacroDeclarationOptions<
   *   [entry: string | URL, policy: LavaMoatPolicy, expected: unknown]
   * >}
   */ ({
    exec: async (t, entryFile, policy, expected) => {
      const result = await run(entryFile, policy)
      t.deepEqual({ .../** @type {any} */ (result) }, expected)
    },
    title: (title) =>
      title ?? `program output matches expected (${genericTitleIndex++}`,
  })
)

test(
  'app without dependencies',
  testExec,
  new URL('./fixture/no-deps/app.js', import.meta.url),
  { resources: {} },
  { hello: 'world' }
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
