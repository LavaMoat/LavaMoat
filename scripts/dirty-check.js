// @ts-check

/**
 * This script is intended to be run in a GitHub Actions workflow to check if
 * test execution changed any files under version control. If so, the script
 * will exit with a non-zero exit code and print an "error" to the GitHub
 * Actions log for each changed file.
 *
 * This is not a shell script because portability.
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
 * @see
 * {@link https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions}
 */

const { promisify } = require('node:util')
const execFile = promisify(require('node:child_process').execFile)

/**
 * Asks `git` if any files changed and exits with a non-zero exit code if so.
 *
 * @returns {Promise<void>}
 * @todo We could determine what lines changed in what file so the file would be
 *   annotated with the error, but it requires some extra parsing of `git diff`
 *   output.
 */
async function main() {
  const { stdout } = await execFile('git', ['diff', '-b', '--name-only'], {
    encoding: 'utf8',
  })

  const changedFiles = stdout.trim().split(/\r?\n/)

  // if this is true, then something changed, and we should fail the build
  if (changedFiles.length) {
    process.exitCode = 1

    for (const file of changedFiles) {
      console.log(
        '::error file=%s,title=Dirty File::%s changed unexpectedly; see job log for diff',
        file,
        file
      )
      const { stdout } = await execFile('git', ['diff', '--', file])
      console.log(stdout)
    }
  } else {
    console.log('::notice::No dirty files detected')
  }
}

if (require.main === module) {
  main().catch((err) => {
    // last resort
    console.log(`::error::${err}`)
    process.exitCode = 1
  })
}
