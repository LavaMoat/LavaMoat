// @ts-check

/**
 * Preps browserify tests.
 *
 * Adapted from shell script (`run.sh`) for portability!
 */

const { spawnSync } = require('child_process')
const path = require('node:path')

/**
 * Whether or not to write a new policy.
 */
const WRITE_AUTO_POLICY = Boolean(process.env.WRITE_AUTO_POLICY)

/**
 * Path to `browserify` workspace
 */
const CWD = path.join(__dirname, '..', '..')

/**
 * Path to policy
 */
const POLICY_PATH = path.join(__dirname, 'lavamoat', 'node', 'policy.json')

/**
 * Path to build script
 */
const BUILD_PATH = path.join(__dirname, 'build.js')

const spawnArgs = [
  'exec',
  'lavamoat',
  '--',
  BUILD_PATH,
  '--policyPath',
  POLICY_PATH,
]

if (WRITE_AUTO_POLICY) {
  spawnArgs.push('--writeAutoPolicy')
}

console.error('npm', spawnArgs.join(' '))

spawnSync('npm', spawnArgs, { stdio: 'inherit', cwd: CWD })
