import test from 'ava'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { lavax } from '../../src/run.js'

/**
 * Creates a fresh temp cache base directory.
 *
 * @returns {Promise<string>}
 */
const makeTmp = () => mkdtemp(path.join(os.tmpdir(), 'lavamoat-run-test-'))

/**
 * Builds injectable fakes that record calls and emulate just enough of `npm`
 * and `@lavamoat/node` for `lavax`'s filesystem-driven steps to succeed without
 * any network access.
 *
 * @param {{ binName?: string }} [opts]
 */
const makeFakes = ({ binName = 'cowsay' } = {}) => {
  const calls = {
    /** @type {any[]} */ install: [],
    /** @type {any[]} */ generatePolicy: [],
    /** @type {any[]} */ run: [],
  }

  /** @type {any} */
  const install = async (
    /** @type {string} */ spec,
    /** @type {any} */ options
  ) => {
    calls.install.push({ spec, options })
    const { cwd } = options
    // Emulate npm: record the dependency in the sandbox package.json and
    // populate node_modules with a minimal installed package + bin.
    const pkgPath = path.join(cwd, 'package.json')
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    pkg.dependencies = { [binName]: '^1.0.0' }
    await writeFile(pkgPath, JSON.stringify(pkg))
    const modDir = path.join(cwd, 'node_modules', binName)
    await mkdir(modDir, { recursive: true })
    await writeFile(
      path.join(modDir, 'package.json'),
      JSON.stringify({ name: binName, bin: { [binName]: 'cli.js' } })
    )
    await writeFile(path.join(modDir, 'cli.js'), '// bin\n')
  }

  /** @type {any} */
  const generatePolicy = async (
    /** @type {string} */ binPath,
    /** @type {any} */ options
  ) => {
    calls.generatePolicy.push({ binPath, options })
    if (options.write && options.policyPath) {
      await mkdir(path.dirname(options.policyPath), { recursive: true })
      await writeFile(options.policyPath, JSON.stringify({ resources: {} }))
    }
    return { resources: {} }
  }

  /** @type {any} */
  const run = async (
    /** @type {string} */ binPath,
    /** @type {any} */ options
  ) => {
    calls.run.push({ binPath, options, argv: [...process.argv] })
    return { ran: binPath }
  }

  return { calls, options: { install, run, generatePolicy } }
}

test.serial(
  'lavax - propagates secure defaults to install, policy, and run',
  async (t) => {
    const cacheDir = await makeTmp()
    t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
    const { calls, options } = makeFakes()

    await lavax('cowsay', ['Hello!'], { ...options, cacheDir })

    // install: lifecycle scripts disabled by default
    t.is(calls.install.length, 1)
    t.is(calls.install[0].spec, 'cowsay')
    t.is(calls.install[0].options.allowScripts, false)

    // policy + run: untrusted root, prodOnly by default
    t.is(calls.generatePolicy.length, 1)
    t.is(calls.generatePolicy[0].options.trustRoot, false)
    t.is(calls.generatePolicy[0].options.prodOnly, true)
    t.is(calls.run.length, 1)
    t.is(calls.run[0].options.trustRoot, false)
    t.is(calls.run[0].options.prodOnly, true)

    // forwarded args are presented to the bin via process.argv
    t.deepEqual(calls.run[0].argv.slice(2), ['Hello!'])
  }
)

test.serial(
  'lavax - allowScripts flows through to the installer',
  async (t) => {
    const cacheDir = await makeTmp()
    t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
    const { calls, options } = makeFakes()

    await lavax('cowsay', [], { ...options, cacheDir, allowScripts: true })

    t.is(calls.install[0].options.allowScripts, true)
  }
)

test.serial('lavax - prodOnly:false flows to policy and run', async (t) => {
  const cacheDir = await makeTmp()
  t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
  const { calls, options } = makeFakes()

  await lavax('cowsay', [], { ...options, cacheDir, prodOnly: false })

  t.is(calls.generatePolicy[0].options.prodOnly, false)
  t.is(calls.run[0].options.prodOnly, false)
})

test.serial('lavax - reuses the cached install on a second run', async (t) => {
  const cacheDir = await makeTmp()
  t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
  const { calls, options } = makeFakes()

  await lavax('cowsay', [], { ...options, cacheDir })
  await lavax('cowsay', [], { ...options, cacheDir })

  t.is(calls.install.length, 1)
})

test.serial('lavax - force reinstalls even when cached', async (t) => {
  const cacheDir = await makeTmp()
  t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
  const { calls, options } = makeFakes()

  await lavax('cowsay', [], { ...options, cacheDir })
  await lavax('cowsay', [], { ...options, cacheDir, force: true })

  t.is(calls.install.length, 2)
})

test.serial('lavax - reuses the cached policy unless regenerate', async (t) => {
  const cacheDir = await makeTmp()
  t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
  const { calls, options } = makeFakes()

  await lavax('cowsay', [], { ...options, cacheDir }) // generates
  await lavax('cowsay', [], { ...options, cacheDir }) // cached
  t.is(calls.generatePolicy.length, 1)
  // the cached policy is still enforced: run receives its path
  t.truthy(calls.run[1].options.policyPath)

  await lavax('cowsay', [], { ...options, cacheDir, regenerate: true })
  t.is(calls.generatePolicy.length, 2)
})

test.serial(
  'lavax - restores process.argv after run and on rejection',
  async (t) => {
    const cacheDir = await makeTmp()
    t.teardown(() => rm(cacheDir, { recursive: true, force: true }))
    const before = [...process.argv]

    const { options } = makeFakes()
    await lavax('cowsay', ['x'], { ...options, cacheDir })
    t.deepEqual(process.argv, before)

    const failing = {
      ...makeFakes().options,
      run: /** @type {any} */ (
        async () => {
          throw new Error('boom')
        }
      ),
    }
    await t.throwsAsync(
      lavax('cowsay', ['y'], { ...failing, cacheDir, force: true }),
      { message: 'boom' }
    )
    t.deepEqual(process.argv, before)
  }
)
