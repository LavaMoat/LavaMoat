import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_POLICY_OVERRIDE_PATH,
  DEFAULT_POLICY_PATH,
} from '../src/constants.js'

/**
 * @import {Fixture, FixtureOptions} from './types.js'
 */

export const DEFAULT_ENTRYPOINT_FILENAME = 'index.js'

/**
 * @param {string | URL} referrer `file:` URL to the test file (e.g.
 *   `import.meta.url`)
 * @returns {(name: string, options?: FixtureOptions) => Fixture}
 */
export const fixtureFinder = (referrer) => {
  /**
   * Returns relevant paths for a fixture
   *
   * @param {string} name Fixture name
   * @param {FixtureOptions} [options] Fixture options
   * @returns {Fixture} Fixture data
   */
  const fixture = (
    name,
    { entrypoint, entrypointFilename = DEFAULT_ENTRYPOINT_FILENAME } = {}
  ) => {
    const dir = fileURLToPath(new URL(`./fixture/${name}`, referrer))
    // do not compute entrypoint relative to dir if it already exists
    entrypoint ??= path.join(dir, entrypointFilename)
    const policyPath = path.join(dir, DEFAULT_POLICY_PATH)
    const policyOverridePath = path.join(dir, DEFAULT_POLICY_OVERRIDE_PATH)
    return { entrypoint, dir, policyPath, policyOverridePath }
  }
  return fixture
}
