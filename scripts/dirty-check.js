// @ts-check

/**
 * This script is intended to be run in a GitHub Actions workflow to check if
 * test execution changed any files under version control. If so, the script
 * will exit with a non-zero exit code and print an "error" to the GitHub
 * Actions log for each changed file.
 *
 * When running in a local development environment, it solves the same problem,
 * but runs differently. It's expected to run after the test finish--as in
 * CI--but it does so within the context of `lint-staged`. With `lint-staged`,
 * any _unstaged_ changes are ignored during its task execution--but only files
 * unstaged _when `lint-staged` begins execution_. Then, if the test suite
 * changes any files, this script will detect _only those_ changes and take
 * appropriate action.
 *
 * @example
 *
 * ```yaml
 * on: [push, pull_request]
 * jobs:
 *   test:
 *     runs-on: ubuntu-latest
 *   steps:
 *     - run: your stuff
 *     - run: node ./scripts/dirty-check.js
 * ```
 *
 * @packageDocumentation
 * @see {@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions}
 */

const { promisify } = require('node:util')
const execFile = promisify(require('node:child_process').execFile)

const CI = Boolean(process.env.CI)

/**
 * Info logger
 *
 * - Outputs as a GitHub Action Command if running in CI
 * - Writes to STDERR if running locally
 *
 * @param {string} message
 */
const info = CI
  ? (message) => {
      console.log(`::notice::${message}`)
    }
  : (message) => {
      console.error('[INFO]', message)
    }

/**
 * Error logger
 *
 * - Outputs as a GitHub Action Command if running in CI
 * - Writes to STDERR if running locally
 *
 * @param {string} message
 * @param {string} title
 */
const error = CI
  ? (message, title) => {
      console.log(`::error,title=${title}::${message}`)
    }
  : (message, title) => {
      console.error('[ERROR]', title, ':', message)
    }

/**
 * Plain logger for `git diff` output
 *
 * - Always writes to STDOUT
 */
const log = console.log.bind(console)

/**
 * Asks `git` if any files changed and exits with a non-zero exit code if so.
 *
 * @returns {Promise<void>}
 * @todo We could determine what lines changed in what file so the file would be
 *   annotated with the error, but it requires some extra parsing of `git diff`
 *   output.
 */
async function main() {
  if (CI) {
    await execFile('git', ['add', '.'])
  }

  // args for first command which just chceks if any files are dirty
  const diffResultArgs = ['diff', '-b', '--quiet']

  if (CI) {
    diffResultArgs.push('--staged')
  }

  const diffResultPromise = execFile('git', diffResultArgs, {
    encoding: 'utf8',
  })

  try {
    await diffResultPromise
    info('No dirty files detected')
  } catch (e) {
    if (e.code !== 1 || e.killed || e.stderr !== '') {
      throw e
    }
    // something changed, and we should fail the build
    process.exitCode = 1

    error(
      'Working area contains unexpected changes; see job log for diff',
      'Dirty File'
    )

    // args for second command which shows the actual diff(s)
    const diffArgs = ['diff', '-b']
    if (CI) {
      diffArgs.push('--staged')
    }
    const { stdout } = await execFile('git', diffArgs, {
      encoding: 'utf8',
    })

    log(stdout)
  }
}

if (require.main === module) {
  main().catch((err) => {
    // last resort
    error(err, 'Unhandled Rejection')
    process.exitCode = 1
  })
}
