/**
 * Reusable CLI options
 *
 * @packageDocumentation
 */

import path from 'node:path'
import {
  DEFAULT_POLICY_DEBUG_PATH,
  DEFAULT_POLICY_OVERRIDE_PATH,
  DEFAULT_POLICY_PATH,
} from '../constants.js'

/**
 * "Behavior options" group name for `--help` output
 */
export const BEHAVIOR_GROUP = 'Behavior Options:'

/**
 * "Path options" group name for `--help` output
 */
export const PATH_GROUP = 'Path Options:'

/**
 * "Logging options" group name for `--help` output
 */
export const LOGGING_GROUP = 'Logging Options:'

/**
 * @import {Options} from 'yargs'
 */

/**
 * @satisfies {Record<string, Options>}
 */
export const pathOptions = /** @type {const} */ ({
  // #region path

  /**
   * The three `policy*` options below are used for both reading and writing.
   *
   * Note that `coerce: path.resolve` is _only_ appropriate for the `root`
   * option, as the others are computed from it!
   */

  policy: {
    alias: ['p'],
    describe: 'Filepath to a policy file',
    type: 'string',
    normalize: true,
    default: DEFAULT_POLICY_PATH,
    nargs: 1,
    requiresArg: true,
    global: true,
    group: PATH_GROUP,
  },
  'policy-override': {
    alias: ['o'],
    describe: 'Filepath to a policy override file',
    type: 'string',
    normalize: true,
    defaultDescription: DEFAULT_POLICY_OVERRIDE_PATH,
    nargs: 1,
    requiresArg: true,
    global: true,
    group: PATH_GROUP,
  },
  'policy-debug': {
    describe: 'Filepath to a policy debug file',
    defaultDescription: DEFAULT_POLICY_DEBUG_PATH,
    nargs: 1,
    type: 'string',
    requiresArg: true,
    global: true,
    group: PATH_GROUP,
  },
  root: {
    describe: 'Path to application root directory',
    type: 'string',
    nargs: 1,
    requiresArg: true,
    normalize: true,
    default: process.cwd(),
    defaultDescription: '(current directory)',
    coerce: path.resolve,
    global: true,
    group: PATH_GROUP,
  },
  // #endregion
})

/**
 * @satisfies {Record<string, Options>}
 */
export const behaviorOptions = /** @type {const} */ ({
  // #region behavior
  bin: {
    alias: ['b'],
    type: 'boolean',
    description: 'Resolve entrypoint as a bin script',
    global: true,
    group: BEHAVIOR_GROUP,
  },
  dev: {
    describe: 'Include development dependencies',
    type: 'boolean',
    global: true,
    group: BEHAVIOR_GROUP,
  },
  // #endregion
})

/**
 * @satisfies {Record<string, Options>}
 */
export const globalOptions = /** @type {const} */ ({
  verbose: {
    describe: 'Enable verbose logging',
    type: 'boolean',
    global: true,
    group: LOGGING_GROUP,
  },
  quiet: {
    describe: 'Disable all logging',
    type: 'boolean',
    global: true,
    group: LOGGING_GROUP,
  },
})
