/**
 * @import {TestFn, ExecutionContext} from 'ava'
 */

const test = /** @type {TestFn} */ (/** @type {unknown} */ (require('ava')))
const { execFile } = require('node:child_process')
const path = require('node:path')
const { promisify } = require('node:util')

const execAsync = promisify(execFile)

/**
 * Cleans up a string to be used in snapshot test by normalizing certain values.
 *
 * @param {string} str The input string to clean up.
 * @returns {string} The cleaned-up string.
 */
const cleanupSnapshotString = (str) =>
  str
    // strip cwd
    .replace(CWD, '/LavaMoat/packages/git-safe-dependencies')
    // normalize SHA to a fixed value
    .replace(
      /(?<=use:\s)([a-z_-]+\/[a-z_-]+)@(?:[0-9a-f]{40})/,
      '$1@a110ca7ab1edeadbeefcafeaffablebabblebabe'
    )
    // normalize problem IDs to a fixed value
    .replace(
      /(?<=problem\sid:\s)([a-z_-]+\/[a-z_-]+):(?:[0-9a-f]{8})/,
      '$1:a110ca7a'
    )

/**
 * `git-safe-dependencies` workspace dir
 */
const CWD = path.join(__dirname, '..')

/**
 * `git-safe-dependencies/src` directory
 */
const SRC_DIR = path.join(CWD, 'src')

/**
 * Runs a CLI test with the provided arguments and snapshots the output.
 *
 * @param {ExecutionContext} t The test context
 * @param {Object} options Options
 * @param {Object} options.args Arguments to pass to the CLI to be passed as
 *   options
 * @param {string} [options.cli] The CLI file to run relative to the , defaults
 *   to 'cli.js'. Relative to
 * @returns {Promise<void>} A promise that resolves when the test is complete.
 */
const runCliTest = test.macro(async (t, { args, cli = 'cli.js' } = {}) => {
  const resolvedArgs = Object.entries(args).map(
    ([key, value]) =>
      `--${key}=${path.relative(process.cwd(), path.join(__dirname, 'fixtures', value))}`
  )

  const bin = path.relative(CWD, path.join(SRC_DIR, cli))

  const command = `node ${bin} ${resolvedArgs.join(' ')}`
  t.log(`Running command: ${command}`)
  const { stdout, stderr, ...rest } = await execAsync(process.execPath, [
    bin,
    ...resolvedArgs,
  ]).catch((error) => error)
  t.snapshot({
    command,
    stdout: cleanupSnapshotString(stdout),
    stderr: cleanupSnapshotString(stderr),
    code: 'code' in rest ? rest.code : 0,
  })
})

test('npm project', runCliTest, { args: { projectRoot: 'npm' } })
test('npm workspaces project', runCliTest, {
  args: { projectRoot: 'npm-workspaces' },
})
test('npm realistic project', runCliTest, {
  args: { projectRoot: 'npm-realistic' },
})
test('yarn berry project', runCliTest, { args: { projectRoot: 'yarn-berry' } })
test('yarn berry realistic project', runCliTest, {
  args: { projectRoot: 'yarn-berry-realistic' },
})
test('yarn classic project', runCliTest, {
  args: { projectRoot: 'yarn-classic' },
})
test('yarn classic no package project', runCliTest, {
  args: { projectRoot: 'yarn-classic-nopackage' },
})
test('yarn classic realistic project', runCliTest, {
  args: { projectRoot: 'yarn-classic-realistic' },
})
test('yarn classic realistic with ignore', runCliTest, {
  args: {
    projectRoot: 'yarn-classic-realistic',
    ignore: 'yarn-classic-realistic/yarn.lock.ignore.json',
  },
})
test('yarn mmm project', runCliTest, { args: { projectRoot: 'yarn-mmm' } })

test('actions workflow', runCliTest, {
  cli: 'cli-actions.js',
  args: { workflows: 'workflows' },
})
test('actions workflow2 with ignores', runCliTest, {
  cli: 'cli-actions.js',
  args: { workflows: 'workflows2', ignore: 'workflows2/ignore.json' },
})
