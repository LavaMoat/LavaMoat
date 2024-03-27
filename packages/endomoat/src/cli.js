#!/usr/bin/env node

/**
 * Main CLI entry point
 *
 * @remarks
 * As tempting as it may be to try to move stuff out of here, it _will_ break
 * type inference, and you'll need to sort that out yourself.
 *
 * Regarding middleware: Any option which _does not_ either a) need other
 * options for postprocessing, or b) need to be asynchronous--should use
 * {@link yargs.coerce} instead.
 * @packageDocumentation
 */

import assert from 'node:assert'
import path from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
  constants,
  generateAndWritePolicy,
  loadPolicies,
  run,
} from './index.js'

const BEHAVIOR_GROUP = 'Behavior Options:'

yargs(hideBin(process.argv))
  .options({
    policy: {
      alias: ['p'],
      describe: 'Filepath to a policy file',
      type: 'string',
      normalize: true,
      default: constants.DEFAULT_POLICY_PATH,
      nargs: 1,
      requiresArg: true,
      global: true,
      coerce: path.resolve,
    },
    'policy-override': {
      alias: ['o', 'override'],
      describe: 'Filepath to a policy override file',
      type: 'string',
      normalize: true,
      default: constants.DEFAULT_POLICY_OVERRIDE_PATH,
      nargs: 1,
      requiresArg: true,
      global: true,
      coerce: path.resolve,
    },
    'policy-debug': {
      alias: ['pd'],
      describe: 'Filepath to a policy debug file',
      default: constants.DEFAULT_POLICY_DEBUG_PATH,
      nargs: 1,
      type: 'string',
      requiresArg: true,
      global: true,
      coerce: path.resolve,
    },
    cwd: {
      describe: 'Path to application root directory',
      type: 'string',
      nargs: 1,
      requiresArg: true,
      normalize: true,
      default: process.cwd(),
      defaultDescription: '(current directory)',
      coerce: path.resolve,
      global: true,
    },
  })
  .check((argv) => {
    assert(path.isAbsolute(argv.cwd), 'cwd must be an absolute path')
    assert(path.isAbsolute(argv.policy), 'policy must be an absolute path')
    assert(
      path.isAbsolute(argv['policy-override']),
      'policy-override must be an absolute path'
    )
    assert(
      path.isAbsolute(argv['policy-debug']),
      'policy-debug must be an absolute path'
    )
  })
  /**
   * Default command (no command)
   */
  .command(
    ['$0 <entrypoint>', 'run <entrypoint>'],
    'Run an application',
    (yargs) =>
      yargs
        .positional('entrypoint', {
          describe: 'Path to the application entry point',
          type: 'string',
          normalize: true,
        })
        .demandOption('entrypoint')
        .middleware((argv) => {
          argv.entrypoint = path.resolve(argv.cwd, argv.entrypoint)
        }, true)
        .check((argv) => {
          assert(
            path.isAbsolute(argv.entrypoint),
            'entrypoint must be an absolute path'
          )
        }),
    /**
     * Default command handler.
     *
     * @remarks
     * (That's "handler for the default command"--_not_ "default handler for a
     * command").
     */
    async (argv) => {
      const policy = await loadPolicies(argv.policy, argv.policyOverride)
      await run(argv.entrypoint, policy)
    }
  )
  .command(
    ['gen <entrypoint>', 'generate <entrypoint>'],
    'Generate policy files; overwrites existing policies',
    (yargs) =>
      yargs
        .options({
          run: {
            describe: 'Run the application after policy generated',
            type: 'boolean',
            group: BEHAVIOR_GROUP,
          },
          debug: {
            type: 'boolean',
            describe: 'Additionally write a debug policy',
            group: BEHAVIOR_GROUP,
          },
        })
        .positional('entrypoint', {
          describe: 'Path to the application entry point',
          type: 'string',
          normalize: true,
          coerce: path.resolve,
        })
        .demandOption('entrypoint')
        .middleware((argv) => {
          argv.entrypoint = path.resolve(argv.cwd, argv.entrypoint)
        }, true)
        .check((argv) => {
          assert(
            path.isAbsolute(argv.entrypoint),
            'entrypoint must be an absolute path'
          )
        }),
    async ({ entrypoint, debug, run: shouldRun }) => {
      const policy = await generateAndWritePolicy(entrypoint, { debug })

      if (shouldRun) {
        await run(entrypoint, policy)
      }
    }
  )
  .demandCommand(1)
  .showHelpOnFail(false)
  .version()
  .parse()
