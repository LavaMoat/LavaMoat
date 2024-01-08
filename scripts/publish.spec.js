// @ts-check

/**
 * This tests the `publish` script.
 *
 * `memfs` is used to mock the filesystem.
 *
 * @packageDocumentation
 * @see {@link https://npm.im/memfs}
 */

const crypto = require('node:crypto')
const util = require('node:util')
const { glob: realGlob } = require('glob')
const { EventEmitter } = require('node:events')
const { default: anyTest } = require('ava')
const { memfs, fs } = require('memfs')
const { publishWorkspaces, invokeNpmPublish } = require('./publish')

const realExec = util.promisify(require('child_process').exec)

/**
 * Stub console which records args provided to its method calls.
 *
 * {@link Console} proxy which records the args passed to its method calls in
 * `callArgs`. `callArgs` is a map of all args passed to all calls (as a
 * flattened array) of `console`'s methods _in reverse chronological order_; we
 * care more about what was logged and less about the order in which it was
 * logged
 *
 * @typedef {Console & { callArgs: Map<PropertyKey, any[]> }} ConsolePeeper
 */

/**
 * Stub `child_process.spawn()` which records args provided to its method calls.
 *
 * The `handler` prop should be a function which returns an `EventEmitter` which
 * asynchronously emits an `exit` event and/or an `error` event.
 *
 * @typedef {import('./publish').SpawnFn & {
 *   callArgs: [cmd: string, args: string[], opts?: any][]
 *   handler: (
 *     cmd: string,
 *     args?: string[],
 *     opts?: any
 *   ) => import('node:events').EventEmitter
 * }} SpawnPeeper
 */

/**
 * Test context object for our tests
 *
 * @typedef PublishTestContext
 * @property {ConsolePeeper} console
 * @property {SpawnPeeper} spawn
 */

/**
 * This just tells `ava` we're using {@link PublishTestContext} for the context.
 */
const test = /** @type {import('ava').TestFn<PublishTestContext>} */ (anyTest)

/**
 * A {@link Console} that prints nothing; this is the default `console` stub.
 */
const nullConsole = new Proxy(globalThis.console, {
  get: () => () => {},
})

/**
 * Stub of `child_process.spawn()` that does nothing; this is the default
 * `spawn` stub
 */
const nullSpawn = () => {
  const ee = new EventEmitter()
  setImmediate(() => {
    ee.emit('exit', 0)
  })
  return ee
}

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

test.beforeEach((t) => {
  /** @type {ConsolePeeper} */
  const peeperConsole = Object.assign(
    new Proxy(globalThis.console, {
      get(target, prop, receiver) {
        const val = Reflect.get(target, prop, receiver)
        if (typeof val === 'function') {
          return (...args) => {
            const callArgs = peeperConsole.callArgs.get(prop) ?? []
            peeperConsole.callArgs.set(prop, [...args, ...callArgs])
          }
        }
        return val
      },
    }),
    { callArgs: new Map() }
  )

  /**
   * A {@link SpawnPeeper} whose default behavior is to immediately emit an
   * `exit` event with a `0` exit code.
   *
   * @type {SpawnPeeper}
   */
  const peeperSpawn = Object.assign(
    (cmd, args, opts) => {
      peeperSpawn.callArgs.push([cmd, args, opts])
      return peeperSpawn.handler(cmd, args, opts)
    },
    {
      callArgs: [],
      handler: () => {
        const ee = new EventEmitter()
        setImmediate(() => {
          ee.emit('exit', 0)
        })
        return ee
      },
    }
  )

  t.context = {
    console: peeperConsole,
    spawn: peeperSpawn,
  }
})

/**
 * Base options for {@link publishWorkspaces}, providing some stubs.
 */
const BASE_OPTS = Object.freeze({
  glob: async () => [],
  exec: async () => ({ stdout: '', stderr: '' }),
  fs, // default memfs filesystem
  spawn: nullSpawn,
  console: nullConsole,
  root: '/', // we use this as the custom memfs fs root
})

test('publishWorkspaces - no root package.json', async (t) => {
  await t.throwsAsync(publishWorkspaces(BASE_OPTS), {
    message: /Could not read package.json in workspace root/,
  })
})

test('publishWorkspaces - no workspaces', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': JSON.stringify({ name: 'root', version: '1.0.0' }),
    },
  })

  await t.throwsAsync(publishWorkspaces({ ...BASE_OPTS, fs }), {
    message: /No "workspaces" prop found/,
  })
})

test('publishWorkspaces - invalid root package.json', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': 'not json',
    },
  })

  await t.throwsAsync(publishWorkspaces({ ...BASE_OPTS, fs }), {
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
    publishWorkspaces({
      ...BASE_OPTS,
      fs,
      glob: () => Promise.reject(err),
    }),
    { is: err }
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

  await t.throwsAsync(publishWorkspaces({ ...BASE_OPTS, fs }), {
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

  await publishWorkspaces({
    ...BASE_OPTS,
    glob: realGlob,
    fs,
    console: t.context.console,
  })

  const callArgs = t.context.console.callArgs.get('warn') ?? []
  t.true(
    callArgs.some((arg) =>
      /Workspace dir .+ contains no `package\.json`/.test(arg)
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
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
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
      console: t.context.console,
    }),
    { is: err }
  )
})

test('publishWorkspaces - unparseable workspace package.json', async (t) => {
  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': 'oops',
        },
      },
    },
  })

  await t.throwsAsync(
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
      fs,
      console: t.context.console,
    }),
    { instanceOf: SyntaxError }
  )
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

  await publishWorkspaces({
    ...BASE_OPTS,
    glob: realGlob,
    fs,
    console: t.context.console,
  })

  const callArgs = t.context.console.callArgs.get('info') ?? []
  t.true(callArgs.includes('Skipping workspace workspace1; private package'))
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

  await publishWorkspaces({
    ...BASE_OPTS,
    glob: realGlob,
    fs,
    console: t.context.console,
  })

  const callArgs = t.context.console.callArgs.get('info') ?? []
  t.true(callArgs.includes('Nothing to publish'))
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
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
      fs,
      console: t.context.console,
    }),
    {
      message:
        'Missing package name and/or version in /packages/workspace1/package.json; cannot be published',
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
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
      fs,
      console: t.context.console,
    }),
    {
      message:
        'Missing package name and/or version in /packages/workspace1/package.json; cannot be published',
    }
  )
})

test('publishWorkspaces - unknown package', async (t) => {
  const pkgName = getRandomPkgName()

  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: pkgName,
            version: '1.0.0',
          }),
        },
      },
    },
  })

  // uses real `npm view`
  await t.throwsAsync(
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
      fs,
      console: t.context.console,
      exec: realExec,
    }),
    { message: /Querying npm for package.+failed:/ }
  )
})

test('publishWorkspaces - new package', async (t) => {
  // random package name
  const pkgName = getRandomPkgName()

  const { fs } = memfs({
    '/': {
      'package.json': DEFAULT_ROOT_PKG_JSON,
      packages: {
        workspace1: {
          'package.json': JSON.stringify({
            name: pkgName,
            version: '1.0.0',
          }),
        },
      },
    },
  })

  // uses real `npm view`
  await publishWorkspaces({
    ...BASE_OPTS,
    glob: realGlob,
    fs,
    console: t.context.console,
    exec: realExec,
    newPkg: [pkgName],
  })

  const callArgs = t.context.console.callArgs.get('info') ?? []
  t.true(callArgs.includes(`Package ${pkgName} confirmed as new`))
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
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
      fs,
      console: t.context.console,
      exec: async () => ({ stdout: 'not json', stderr: '' }),
    }),
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
  await publishWorkspaces({
    ...BASE_OPTS,
    glob: realGlob,
    fs,
    console: t.context.console,
    exec: realExec,
  })

  const callArgs = t.context.console.callArgs.get('info') ?? []
  t.true(callArgs.includes('Nothing to publish'))
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

  // uses real `npm view`
  await publishWorkspaces({
    ...BASE_OPTS,
    glob: realGlob,
    fs,
    console: t.context.console,
    exec: realExec,
  })

  const callArgs = t.context.console.callArgs.get('info') ?? []
  t.true(
    callArgs.includes(
      'Publishing 2 package(s): lavamoat-tofu@9000.31337.42, lavamoat@31337.42.9000'
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
    publishWorkspaces({
      ...BASE_OPTS,
      glob: realGlob,
      fs,
      console: t.context.console,
      exec: realExec,
    }),
    { message: `Duplicate package name(s) found in workspaces: lavamoat` }
  )
})

test('invokeNpmPublish - basic usage', async (t) => {
  const pkgName = getRandomPkgName()
  await invokeNpmPublish([pkgName], {
    spawn: t.context.spawn,
    console: t.context.console,
    root: '/',
  })

  t.deepEqual(t.context.spawn.callArgs, [
    [
      'npm',
      ['publish', '--access=public', `--workspace=${pkgName}`],
      { stdio: 'inherit', cwd: '/', shell: true },
    ],
  ])
})

test('invokeNpmPublish - dry run', async (t) => {
  const pkgName = getRandomPkgName()
  await invokeNpmPublish([pkgName], {
    dryRun: true,
    spawn: t.context.spawn,
    console: t.context.console,
    root: '/',
  })

  t.deepEqual(t.context.spawn.callArgs, [
    [
      'npm',
      ['publish', '--access=public', `--workspace=${pkgName}`, '--dry-run'],
      { stdio: 'inherit', cwd: '/', shell: true },
    ],
  ])
})

test('invokeNpmPublish - nonzero exit code', async (t) => {
  t.context.spawn.handler = () => {
    const ee = new EventEmitter()
    setImmediate(() => {
      ee.emit('exit', 1)
    })
    return ee
  }
  const pkgName = getRandomPkgName()
  await t.throwsAsync(
    invokeNpmPublish([pkgName], {
      dryRun: true,
      spawn: t.context.spawn,
      console: t.context.console,
      root: '/',
    }),
    { message: 'npm publish exited with code 1' }
  )
})

test('invokeNpmPublish - other error', async (t) => {
  const err = new Error('help meeeee')
  t.context.spawn.handler = () => {
    const ee = new EventEmitter()
    setImmediate(() => {
      ee.emit('error', err)
    })
    return ee
  }
  const pkgName = getRandomPkgName()
  await t.throwsAsync(
    invokeNpmPublish([pkgName], {
      dryRun: true,
      spawn: t.context.spawn,
      console: t.context.console,
      root: '/',
    }),
    { is: err }
  )
})
