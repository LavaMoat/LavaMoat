// eslint-disable-next-line ava/use-test
const { default: test } = require('ava')
const { promisify } = require('node:util')
const execFile = promisify(require('node:child_process').execFile)
const path = require('node:path')
const { version } = require('../package.json')

const LAVERNA_SCRIPT = require.resolve('../src/cli.js')
const FIXTURE_DIR = path.join(__dirname, 'fixture')

/**
 * @typedef ProjectTestParams
 * @property {string} name - Fixture name
 * @property {string[]} [args] - Args for Laverna
 * @property {import('node:child_process').ExecFileOptions} [opts] - Options for
 *   Laverna; will include computed `cwd` option
 */

/**
 * {@link runCli} resolves with this when successful
 *
 * @typedef RunCliResult
 * @property {string} stderr - Stderr of CLI invocation
 * @property {string} stdout - Stdout of CLI invocation
 * @property {string} cmd - Command executed
 * @property {boolean} isError - Whether the result is an error
 * @property {import('node:child_process').ExecFileOptions} opts - Options used
 * @property {string | number | null} [code] - Exit code
 */

/**
 * {@link runCli} resolves with this if an error occurs
 *
 * @typedef {import('node:child_process').ExecFileException &
 *   RunCliResult & { isError: true }} RunCliFailureResult
 */

/**
 * A macro to test a project fixture.
 *
 * Returns a `Promise` that resolves to a {@link RunCliResult} or a
 * {@link  RunCliFailureResult}.
 */
const testProject = test.macro(
  /**
   * @template [Context=unknown] Default is `unknown`
   * @param {import('ava').ExecutionContext<Context>} t - AVA test context
   * @param {ProjectTestParams} params - Test parameters
   * @param {import('ava').ImplementationFn<
   *   [result: RunCliResult | RunCliFailureResult],
   *   Context
   * >} impl
   *   Implementation function receiving a test context object and a
   *   `Promise<string>` object, which is the stderr of the CLI invocation
   */
  async (t, params, impl) => {
    const { name, args = [], opts = {} } = params
    const cwd = path.join(FIXTURE_DIR, name)

    t.log(`Using fixture: ${path.relative(process.cwd(), cwd)}`)

    return impl(t, await runCli(args, { ...opts, cwd }))
  }
)

/**
 * Runs `laverna` CLI with given options
 *
 * - Forces `NO_COLOR` env var to be set to `1` to prevent kleur from coloring
 *   output
 * - Forces `--dryRun` to be set to prevent `npm publish` from actually running
 * - Forces `--yes` to be set to prevent confirmation prompt
 *
 * @overload
 * @param {import('node:child_process').ExecFileOptions} [opts]
 * @returns {Promise<RunCliResult | RunCliFailureResult>}
 */

/**
 * Runs `laverna` CLI with given args and options
 *
 * - Forces `NO_COLOR` env var to be set to `1` to prevent kleur from coloring
 *   output
 * - Forces `--dryRun` to be set to prevent `npm publish` from actually running
 * - Forces `--yes` to be set to prevent confirmation prompt
 *
 * @overload
 * @param {string[]} args
 * @param {import('node:child_process').ExecFileOptions} [opts]
 * @returns {Promise<RunCliResult | RunCliFailureResult>}
 */

/**
 * Runs `laverna` CLI with given args and/or options
 *
 * - Forces `NO_COLOR` env var to be set to `1` to prevent kleur from coloring
 *   output
 * - Forces `--dryRun` to be set to prevent `npm publish` from actually running
 * - Forces `--yes` to be set to prevent confirmation prompt
 *
 * @param {string[] | import('node:child_process').ExecFileOptions} [argsOrOpts]
 * @param {import('node:child_process').ExecFileOptions} [maybeOpts]
 * @returns {Promise<RunCliResult | RunCliFailureResult>}
 */
async function runCli(argsOrOpts, maybeOpts = {}) {
  /** @type {string[]} */
  let args
  /** @type {import('node:child_process').ExecFileOptions} */
  let opts

  if (Array.isArray(argsOrOpts)) {
    args = argsOrOpts
    opts = maybeOpts
  } else {
    opts = argsOrOpts ?? {}
    args = []
  }

  // the env is needed to resolve npm
  opts = {
    ...opts,
    env: { PATH: process.env.PATH, ...opts.env, NO_COLOR: '1' },
  }
  args = [...new Set([...args, '--dryRun', '--yes'])]

  /** @type {RunCliResult | RunCliFailureResult} >} */
  let result
  try {
    const execResult = await execFile(
      process.execPath,
      [LAVERNA_SCRIPT, ...args],
      opts
    )

    result = {
      cmd: `${process.execPath} ${LAVERNA_SCRIPT} ${args.join(' ')}`,
      opts,
      isError: false,
      ...execResult,
    }
  } catch (e) {
    const err = /**
     * @type {import('node:child_process').ExecFileException & {
     *   stderr: string
     *   stdout: string
     * }}
     */ (e)
    result = Object.assign(err, {
      cmd: err.cmd ?? `${process.execPath} ${LAVERNA_SCRIPT} ${args.join(' ')}`,
      opts,
      isError: true,
    })
  }
  return result
}

test('cli - prints help', async (t) => {
  t.plan(2)
  const result = await runCli(['--help'])

  t.snapshot(result.stdout)
  t.like(result, { isError: false, code: undefined })
})

test(
  'cli - workspaceless project',
  testProject,
  { name: 'no-workspace' },
  async (t, result) => {
    t.plan(2)

    t.like(result, {
      isError: true,
      code: 1,
    })
    t.true(
      result.stderr.includes('No "workspaces" prop found in ./package.json')
    )
  }
)

test(
  'cli - print name/version',
  testProject,
  { name: 'no-workspace' },
  async (t, result) => {
    t.true(result.stderr.includes(`laverna@${version}`))
  }
)

test(
  'cli - version already published',
  testProject,
  { name: 'already-published' },
  async (t, result) => {
    t.plan(2)

    t.like(result, {
      isError: false,
      code: undefined,
    })
    t.true(
      result.stderr.includes(
        'Skipping already-published package lavamoat@1.0.6'
      )
    )
  }
)

test(
  'cli - new version',
  testProject,
  { name: 'new-version' },
  async (t, result) => {
    t.plan(3)

    t.like(result, {
      isError: false,
      code: undefined,
    })

    t.true(result.stderr.includes('These package(s) will be published'))
    t.true(result.stderr.includes('lavamoat@31337.420.69'))
  }
)

test(
  'cli - new package',
  testProject,
  { name: 'new-pkg', args: ['--newPkg=@lavamoat/larvamoat'] },
  async (t, result) => {
    t.plan(4)

    t.like(result, {
      isError: false,
      code: undefined,
    })

    t.true(
      result.stderr.includes('Package @lavamoat/larvamoat confirmed as new')
    )
    t.true(result.stderr.includes('These package(s) will be published'))
    t.true(result.stderr.includes('@lavamoat/larvamoat@0.1.0'))
  }
)

test(
  'cli - new package (kebab-case)',
  testProject,
  { name: 'new-pkg', args: ['--new-pkg=@lavamoat/larvamoat'] },
  async (t, result) => {
    t.plan(4)

    t.like(result, {
      isError: false,
      code: undefined,
    })

    t.true(
      result.stderr.includes('Package @lavamoat/larvamoat confirmed as new')
    )
    t.true(result.stderr.includes('These package(s) will be published'))
    t.true(result.stderr.includes('@lavamoat/larvamoat@0.1.0'))
  }
)

test(
  'cli - mixed-cased error (new package)',
  testProject,
  {
    name: 'new-pkg',
    args: ['--new-pkg=@lavamoat/larvamoat', '--newPkg=@lavamoat/larvamoat'],
  },
  async (t, result) => {
    t.like(result, {
      isError: true,
      code: 1,
    })

    t.true(
      result.stderr.includes('Use camelCase or kebab-case flags; not both')
    )
  }
)

test(
  'cli - mixed-cased error (dry run)',
  testProject,
  {
    name: 'new-version',
    args: ['--dry-run'], // dryRun is already present via the macro
  },
  async (t, result) => {
    t.like(result, {
      isError: true,
      code: 1,
    })

    t.true(
      result.stderr.includes('Use camelCase or kebab-case flags; not both')
    )
  }
)
