/**
 * This script checks if `package-lock.json` is up-to-date with the contents of
 * the various `package.json` files via `npm ls`.
 *
 * It will print the result of `npm ls` if it exits with a non-zero code;
 * otherwise it is suppressed.
 *
 * It exists because it should be portable and the only other way I know how to
 * do this is via a Bash script.
 *
 * @packageDocumentation
 */

const { execFileSync } = require('node:child_process')

try {
  execFileSync('npm', ['ls', '--color'], { encoding: 'utf-8' })
  console.log('lint-lockfile: package-lock.json OK')
} catch (err) {
  console.log(err.stdout)
  process.exitCode = 1
}
