/**
 * This tests the `publish` script.
 *
 * `memfs` is used to mock the filesystem.
 *
 * @packageDocumentation
 * @see {@link https://npm.im/memfs}
 */

const kleur = require('kleur')
const crypto = require('node:crypto')
const { glob: realGlob } = require('glob')
const { EventEmitter } = require('node:events')
// eslint-disable-next-line ava/use-test
const { default: anyTest } = require('ava')
const { memfs, fs } = require('memfs')
const { Laverna } = require('../src')
const { mock } = require('node:test')

/**
 * Test context object for our tests
 *
 * @typedef PublishTestContext
 * @property {{ error: import('node:test').Mock<Console['error']> }} console
 * @property {import('node:test').Mock<import('../src').SpawnFn>} spawn
 * @property {(
 *   opts?: import('../src').LavernaOptions,
 *   caps?: import('../src').LavernaCapabilities
 * ) => Promise<void>} runLaverna
 * @property {(
 *   pkgNames: string[],
 *   opts?: import('../src').LavernaOptions,
 *   caps?: import('../src').LavernaCapabilities
 * ) => Promise<void>} runInvokePublish
 */

/**
 * This just tells `ava` we're using {@link PublishTestContext} for the context.
 */
const test = /** @type {import('ava').TestFn<PublishTestContext>} */ (anyTest)

/**
 * A valid `package.json` for the root workspace used in many tests
 */
const DEFAULT_ROOT_PKG_JSON = JSON.stringify({
  name: 'root',
  version: '1.0.0',
  workspaces: ['packages/*'],
})

/**
 * Random pkg name used to test new package detection
 *
 * @returns {string} A random package name
 */
function getRandomPkgName() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Base options for {@link Laverna}, providing some stubs.
 */
const BASE_OPTS = Object.freeze(
  /** @type {import('../src').LavernaOptions} */ ({
    /**
     * Because the root of the phony `memfs` filesystem is `/`, we use it here.
     */
    root: '/', // we use this as the custom memfs fs root

    /**
     * Force dry-run
     */
    dryRun: true,

    /**
     * Never prompt for confirmation in these tests
     */
    yes: true,
  })
)

/**
 * Base capabilities for {@link Laverna}, providing some stubs.
 */
const BASE_CAPS = Object.freeze(
  /** @type {import('../src').LavernaCapabilities} */ ({
    /**
     * The phony `fs` is given to `glob`--it supports a custom `fs` module--so
     * it can find files in there.
     */
    glob: realGlob,
    /**
     * Node.js' `exec` returns more than Laverna needs; this will work for our
     * purposes
     */
    execFile: async () => ({ stdout: '', stderr: '' }),
    /**
     * The phony filesystem provided by `memfs`.
     *
     * Tests should create their own; this is just defensive.
     */
    fs,
  })
)

test.before(() => {
  // this disables ANSI escapes in output for easier comparison
  kleur.enabled = false
})

test.beforeEach((t) => {
  /**
   * This is passed to {@link Laverna} as a capability.
   */
  const console = {
    error: mock.fn(
      /** @type {(message?: any, ...optionalParams: any[]) => void} */ (
        () => {}
      )
    ),
  }

  /**
   * Mock `spawn` fn
   *
   * The default behavior is to immediately emit an `exit` event with a `0` exit
   * code.
   *
   * This is passed to {@link Laverna} as a capability.
   */
  const spawn = mock.fn(
    /**
     * @param {string} cmd
     * @param {string[]} args
     * @param {import('node:child_process').SpawnOptions} opts
     * @returns {import('node:events').EventEmitter}
     */
    (cmd, args, opts) => {
      const ee = new EventEmitter()
      setImmediate(() => {
        ee.emit('exit', 0)
      })
      return ee
    }
  )

  /**
   * Helps run {@link Laverna.invokePublish} with a custom set of options and
   * caps.
   *
   * Provides the default {@link ConsoleSpy} and {@link SpawnSpy} implementations
   * if not overridden by the test.
   *
   * Does not create a child process
   *
   * @param {string[]} pkgNames
   * @param {import('../src').LavernaOptions} opts
   * @param {import('../src').LavernaCapabilities} caps
   * @returns {Promise<void>}
   */
  const runInvokePublish = async (pkgNames, opts = {}, caps = {}) => {
    opts = { ...BASE_OPTS, ...opts }
    t.true(opts.dryRun, 'dryRun must be true for tests')
    const laverna = new Laverna(opts, {
      ...BASE_CAPS,
      console: console,
      spawn: spawn,
      ...caps,
    })
    await laverna.invokePublish(pkgNames)
  }

  /**
   * Helps run {@link Laverna.publishWorkspaces} with a custom set of options and
   * caps
   *
   * Provides the default {@link ConsoleSpy} and {@link SpawnSpy} implementations
   * if not overridden by the test.
   *
   * Does not create a child process
   *
   * @param {import('../src').LavernaOptions} opts
   * @param {import('../src').LavernaCapabilities} caps
   * @returns {Promise<void>}
   */
  const runLaverna = async (opts = {}, caps = {}) => {
    opts = { ...BASE_OPTS, ...opts }
    t.true(opts.dryRun, 'dryRun must be true for tests')
    const laverna = new Laverna(opts, {
      ...BASE_CAPS,
      console,
      spawn,
      ...caps,
    })
    await laverna.publishWorkspaces()
  }

  t.context = {
    console,
    spawn,
    runLaverna,
    runInvokePublish,
  }
})

test('publishWorkspaces - no root package.json', async (t) => {
  await t.throwsAsync(t.context.runLaverna(), {
    message: /Could not read package.json in workspace root/,
  })
})

test('publishWorkspaces - no workspaces', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': JSON.stringify({ name: 'root', version: '1.0.0' }),
    },
  })

  await t.throwsAsync(t.context.runLaverna({}, { fs }), {
    message: /No "workspaces" prop found/,
  })
})

test('publishWorkspaces - invalid root package.json', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': 'not json',
    },
  })

  await t.throwsAsync(t.context.runLaverna({}, { fs }), {
    instanceOf: SyntaxError,
  })
})

test('publishWorkspaces - glob failure', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: ['/somewhere/over/the/rainbow/*'],
      }),
    },
  })

  const err = new Error('glob failed')
  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        glob: async () => {
          throw err
        },
      }
    ),
    { is: err }
  )
})

test('publishWorkspaces - invalid workspaces - not array', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: '/somewhere/over/the/rainbow/*',
      }),
    },
  })

  await t.throwsAsync(t.context.runLaverna({}, { fs }), {
    message: /"workspaces" prop in .+ is invalid; must be array of strings/,
  })
})

test('publishWorkspaces - invalid workspaces - not strings', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: [true, false, 1],
      }),
    },
  })

  await t.throwsAsync(t.context.runLaverna({}, { fs }), {
    message: /"workspaces" prop in .+ is invalid; must be array of strings/,
  })
})

test('publishWorkspaces - invalid JSON error from npm view', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'workspace1',
            version: '1.0.0',
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        execFile: async () => {
          return { stdout: 'not json', stderr: '' }
        },
      }
    ),
    {
      instanceOf: SyntaxError,
    }
  )
})

test('publish workspaces - unexpected JSON parsed from npm view', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'workspace1',
            version: '1.0.0',
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        execFile: async () => ({
          stdout: JSON.stringify({ poppies: 'fritz' }),
          stderr: '',
        }),
      }
    ),
    {
      instanceOf: TypeError,
      message: /was not a JSON array of strings/,
    }
  )
})

test('publishWorkspaces - unexpected error from npm view', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'workspace1',
            version: '1.0.0',
          }),
        },
      },
    },
  })

  const err = new Error('poppies & fritz')
  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        execFile: async () => {
          throw err
        },
      }
    ),
    {
      is: err,
    }
  )
})

test('publishWorkspaces - non-matching glob pattern', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': JSON.stringify({
        name: 'root',
        version: '1.0.0',
        workspaces: ['/somewhere/over/the/rainbow/*'],
      }),
    },
  })

  await t.throwsAsync(t.context.runLaverna({}, { fs }), {
    message: /"workspaces" pattern .+ matched no files\/dirs:/,
  })
})

test('publishWorkspaces - empty workspace dir', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        package1: {},
      },
    },
  })

  await t.context.runLaverna({}, { fs })

  const args = t.context.console.error.mock.calls.flatMap(
    (call) => call.arguments
  )
  t.true(
    args.some((arg) =>
      /Workspace dir .+ contains no `package\.json`/.test(`${arg}`)
    )
  )
})

test('publishWorkspaces - other read failure', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': '{}',
        },
      },
    },
  })

  const err = new Error('read failed')

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        /**
         * This hacks the phony `fs` with a phonier `readFile` which fails if we
         * ask it to get the package.json for workspace1, as defined above
         */
        fs: {
          ...fs,
          promises: {
            ...fs.promises,
            // starting to want sinon about now
            readFile: (filename) => {
              if (filename === '/packages/workspace1/package.json') {
                return Promise.reject(err)
              }
              return fs.promises.readFile(filename)
            },
          },
        },
      }
    ),
    { is: err }
  )
})

test('publishWorkspaces - unparseable workspace package.json', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          // "oops" is literally the content of package.json
          'package.json': 'oops',
        },
      },
    },
  })

  await t.throwsAsync(t.context.runLaverna({}, { fs }), {
    instanceOf: SyntaxError,
  })
})

test('publishWorkspaces - private package', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'workspace1',
            version: '1.0.0',
            private: true,
          }),
        },
      },
    },
  })

  await t.context.runLaverna({}, { fs })

  const args = t.context.console.error.mock.calls.flatMap(
    (call) => call.arguments
  )
  t.true(args.some((arg) => `${arg}`.includes('Skipping private package')))
})

test('publishWorkspaces - nothing to publish', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'workspace1',
            version: '1.0.0',
            private: true,
          }),
        },
      },
    },
  })

  await t.context.runLaverna({}, { fs })

  const args = t.context.console.error.mock.calls.flatMap(
    (call) => call.arguments
  )
  t.true(args.some((arg) => `${arg}`.includes('Nothing to publish')))
})

test('publishWorkspaces - missing workspace package version', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'workspace1',
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
      }
    ),
    {
      message:
        'Missing package name and/or version in ./packages/workspace1/package.json; cannot be published',
    }
  )
})

test('publishWorkspaces - missing workspace package name', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            version: '1.0.0',
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
      }
    ),
    {
      message:
        'Missing package name and/or version in ./packages/workspace1/package.json; cannot be published',
    }
  )
})

test('publishWorkspaces - unknown package', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'super-not-real',
            version: '1.0.0',
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        execFile: async () => {
          // the error thrown here must have a json-parseable `stdout` prop
          throw Object.assign(new Error('stuff & things'), {
            stdout: JSON.stringify({
              error: {
                code: 'fkdj',
                summary: 'stuff & things',
                detail: 'mind yr own biz',
              },
            }),
          })
        },
      }
    ),
    {
      message: /Querying for package.+failed/,
    }
  )
})

test('publishWorkspaces - cannot find npm', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'super-not-real',
            version: '1.0.0',
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        execFile: async () => {
          throw Object.assign(new Error('no npm here'), { code: 'ENOENT' })
        },
      }
    ),
    {
      message: /Could not find npm:/,
    }
  )
})

test('publishWorkspaces - new package', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'super-not-real',
            version: '1.0.0',
          }),
        },
      },
    },
  })

  await t.context.runLaverna(
    { newPkg: ['super-not-real'] },
    {
      fs,
      /**
       * The error thrown here is tossed out, because if `npm view` would throw,
       * Laverna checks `newPkg` for the package name, and if it's there, no
       * error is thrown.
       */
      execFile: async () => {
        throw new Error()
      },
    }
  )

  const args = t.context.console.error.mock.calls.flatMap(
    (call) => call.arguments
  )
  t.true(
    args.some((arg) =>
      `${arg}`.includes(`Package super-not-real confirmed as new`)
    )
  )
})

test('publishWorkspaces - known package - unparseable JSON', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'lavamoat',
            version: '1.0.6', // first published version
          }),
        },
      },
    },
  })

  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        execFile: async () => ({ stdout: 'not json', stderr: '' }),
      }
    ),
    { instanceOf: SyntaxError }
  )
})

test('publishWorkspaces - known package - existing version', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'lavamoat',
            version: '1.0.6', // first published version
          }),
        },
      },
    },
  })

  // uses real `npm view`
  await t.context.runLaverna(
    {},
    {
      fs,
      // alternatively, we could override exec as in the other tests. this is higher-level.
      // it just says that "version 1.0.6 of lavamoat has already been published"
      getVersionsFactory: () => async () => ['1.0.6'],
    }
  )

  const args = t.context.console.error.mock.calls.flatMap(
    (call) => call.arguments
  )
  t.true(args.some((arg) => `${arg}`.includes('Nothing to publish')))
})

test('publishWorkspaces - known packages - new versions', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'lavamoat',
            version: '31337.42.9000', // this doesn't scale
          }),
        },
        workspace2: {
          'package.json': JSON.stringify({
            name: 'lavamoat-tofu',
            version: '9000.31337.42',
          }),
        },
      },
    },
  })

  await t.context.runLaverna(
    {},
    { fs, getVersionsFactory: () => async () => ['1.0.6'] }
  )

  const args = t.context.console.error.mock.calls.flatMap(
    (call) => call.arguments
  )
  t.true(
    args.some((arg) =>
      `${arg}`.includes(
        'These package(s) will be published:\nlavamoat-tofu@9000.31337.42\nlavamoat@31337.42.9000'
      )
    )
  )
})

test('publishWorkspaces - known packages - duplicate package names', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: 'lavamoat',
            version: '31337.42.9000', // this doesn't scale
          }),
        },
        workspace2: {
          'package.json': JSON.stringify({
            name: 'lavamoat',
            version: '9000.31337.42',
          }),
        },
      },
    },
  })

  // uses real `npm view`
  await t.throwsAsync(
    t.context.runLaverna(
      {},
      {
        fs,
        getVersionsFactory: () => async () => ['1.0.6'],
      }
    ),
    { message: `Duplicate package name(s) found in workspaces: lavamoat` }
  )
})

test('invokePublish - basic usage', async (t) => {
  const pkgName = getRandomPkgName()
  await t.context.runInvokePublish([pkgName])

  t.deepEqual(t.context.spawn.mock.calls[0].arguments, [
    'npm',
    ['publish', `--workspace=${pkgName}`, '--dry-run'],
    { stdio: 'inherit', cwd: '/', shell: true },
  ])
})

test('invokePublish - dry run', async (t) => {
  await t.context.runInvokePublish(['foo'])

  t.deepEqual(t.context.spawn.mock.calls[0].arguments, [
    'npm',
    ['publish', `--workspace=foo`, '--dry-run'],
    { stdio: 'inherit', cwd: '/', shell: true },
  ])
})

test('invokePublish - nonzero exit code', async (t) => {
  await t.throwsAsync(
    t.context.runInvokePublish(
      ['foo'],
      {},
      {
        spawn: mock.fn(() => {
          const ee = new EventEmitter()
          setImmediate(() => {
            ee.emit('exit', 1)
          })
          return ee
        }),
      }
    ),
    {
      message: 'npm publish exited with code 1',
    }
  )
})

test('invokePublish - other error', async (t) => {
  const err = new Error('help meeeee')
  await t.throwsAsync(
    t.context.runInvokePublish(
      ['foo'],
      {},
      {
        spawn: mock.fn(() => {
          const ee = new EventEmitter()
          setImmediate(() => {
            ee.emit('error', err)
          })
          return ee
        }),
      }
    ),
    {
      is: err,
    }
  )
})
