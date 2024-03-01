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
import { constants, loadPolicies, run } from './index.js'
import { readJsonFile } from './util.js'

/**
 * Main entry point to CLI
 */
async function main(args = hideBin(process.argv)) {
  // see note below above the call to `.version()`
  const { version } = /** @type {import('type-fest').PackageJson} */ (
    await readJsonFile(new URL('../package.json', import.meta.url))
  )

  yargs(args)
    .scriptName('endomoat')
    /**
     * @remarks
     * `yargs` seems to return the version provided by the `package.json` at the
     * workspace root--not the `package.json` in this project. This is
     * _probably_ not an issue anywhere other than in a dev environment, but I
     * wanted to make sure.
     */
    .version(`${version}`)
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
      },
      'policy-debug': {
        alias: ['pd'],
        describe: 'Filepath to a policy debug file',
        default: constants.DEFAULT_POLICY_DEBUG_PATH,
        nargs: 1,
        type: 'string',
        requiresArg: true,
        global: true,
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
    /**
     * This resolves all paths from `cwd`.
     *
     * @remarks
     * This runs _before_ validation.
     *
     * Note that this does _not_ change the properties named via aliases or
     * camelcasing! Don't use them!!
     */
    .middleware((argv) => {
      argv.policy = path.resolve(argv.cwd, argv.policy)
      argv['policy-override'] = path.resolve(argv.cwd, argv['policy-override'])
      argv['policy-debug'] = path.resolve(argv.cwd, argv['policy-debug'])
    }, true)
    /**
     * This should not fail. If it does, there is a bug.
     */
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
      return true
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
          /**
           * Resolve entrypoint from `cwd`
           */
          .middleware((argv) => {
            argv.entrypoint = path.resolve(argv.cwd, argv.entrypoint)
          }, true)
          /**
           * This should not fail. If it does, there is a bug.
           */
          .check((argv) => {
            assert(
              path.isAbsolute(argv.entrypoint),
              'entrypoint must be an absolute path'
            )
            return true
          }),
      /**
       * Default command handler.
       *
       * @remarks
       * (That's "handler for the default command"--_not_ "default handler for a
       * command").
       */
      async (argv) => {
        await Promise.resolve()
        /** @type {import('lavamoat-core').LavaMoatPolicy} */
        let policy
        try {
          policy = await loadPolicies(argv.policy, argv['policy-override'])
        } catch (e) {
          const err = /** @type {NodeJS.ErrnoException} */ (e)
          if (err.code === 'ENOENT') {
            console.error(
              `Could not load policy from ${argv.policy}: ${err.message}`
            )
            process.exitCode = 1
            return
          }
          throw err
        }

        await run(argv.entrypoint, policy)
      }
    )
    .demandCommand(1)

    .parse()
}

main()
