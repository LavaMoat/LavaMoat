#!/usr/bin/env node

/**
 * Main CLI entry point
 *
 * @remarks
 * As tempting as it may be to try to move stuff out of here, it _will_ break
 * type inference, and you'll need to sort that out yourself. It's possible, but
 * it's probably not worth it.
 *
 * Regarding middleware: Any option which _does not_ either a) need other
 * options for postprocessing, or b) need to be asynchronous--should use
 * {@link yargs.coerce} instead.
 * @packageDocumentation
 */

import './preamble.js'

import chalk from 'chalk'
import { jsonStringifySortedPolicy } from 'lavamoat-core'
import path from 'node:path'
import terminalLink from 'terminal-link'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as constants from './constants.js'
import { run } from './exec/run.js'
import { assertAbsolutePath, readJsonFile } from './fs.js'
import { log } from './log.js'
import { generatePolicy } from './policy-gen/generate.js'
import { loadPolicies } from './policy-util.js'
import { resolveBinScript, resolveEntrypoint } from './resolve.js'

/**
 * @import {PackageJson} from 'type-fest';
 * @import {LavaMoatPolicy} from 'lavamoat-core';
 */

/**
 * "Behavior options" group name for `--help` output
 */
const BEHAVIOR_GROUP = 'Behavior Options:'

/**
 * "Path options" group name for `--help` output
 */
const PATH_GROUP = 'Path Options:'

/**
 * Use this to give emphasis to words in error messages
 */
const em = chalk.yellow

/**
 * Strip out all `lavamoat` CLI args from `process.argv` so that the entrypoint
 * receives a `process.argv` like it would if it were executed directly with
 * `node`.
 *
 * Used for execution only.
 *
 * For this to work, we _must_ mutate `process.argv` _in place_.
 *
 * @param {string} entrypoint Entry module
 * @param {(string | number)[]} nonOptionArguments Array of stuff passed after
 *   `--` on the command-line. Note that Yargs parses numbers, and we have to
 *   convert them back to strings.
 * @returns {void}
 */
const stripProcessArgv = (entrypoint, nonOptionArguments = []) => {
  /**
   * This module could be executed in myriad ways (`lavamoat`, `node
   * /path/to/lavamoat`, `npx lavamoat2`, etc.), so we are just going to
   * recreate the args from scratch
   */
  const start = 0

  /**
   * If the user provided `--` we want everything after that, but if they
   * didn't, the entire rest of the array is lavamoat args, so it can be
   * removed.
   */
  const deleteCount = process.argv.includes('--')
    ? process.argv.indexOf('--')
    : process.argv.length

  /**
   * Path to `node`, any args to `node`, the path to the entrypoint, then
   * whatever was in {@link nonOptionArguments}. Hope this works!
   */
  const items = [
    process.execPath,
    ...process.execArgv,
    entrypoint,
    ...nonOptionArguments.map(String),
  ]

  process.argv.splice(start, deleteCount, ...items)
}

/**
 * Main entry point to CLI
 */
const main = async (args = hideBin(process.argv)) => {
  // In Node.js v23, import attributes are no longer flagged as experimental.
  // See https://nodejs.org/api/esm.html#import-attributes
  // TODO: Use import attributes instead
  // #region use import attributes instead
  const pkgJson = /** @type {PackageJson} */ (
    await readJsonFile(new URL('../package.json', import.meta.url))
  )
  const version = `${pkgJson.version}`
  const homepage = `${pkgJson.homepage}`
  // strip the `git+` prefix from protocol and `.git` suffix
  const repository = `${/** @type {any} */ (pkgJson.repository).url}`.slice(
    4,
    -4
  )
  const bugs = `${pkgJson.bugs}`
  // #endregion

  /**
   * Bug-reporting link for truly unexpected error messages
   *
   * @privateRemarks
   * TODO: Once we sort out the `Error` types, we can add a field so any `Error`
   * could opt-in to the "click here to report this bug" behavior.
   */
  const reportThisBug = `please ${terminalLink('report this bug', bugs)}`

  /**
   * A middleware shared between `run` and `generate` commands.
   *
   * @remarks
   * It is too painful to use `yargs`'s types to determine the shape of the
   * expected options, so it needs to be done manually and kept in sync.
   * `entrypoint` is the only property here which is specific to a command; it
   * just so happens that both commands have idential `entrypoint` arguments
   * (positionals). All _other_ properties are defined as global options; if
   * _all_ properties were global, this could just live in global middleware.
   * @param {{
   *   entrypoint: string
   *   bin?: boolean
   *   root: string
   * }} argv
   * @returns {void}
   */
  const processEntrypointMiddleware = (argv) => {
    const { entrypoint } = argv
    argv.entrypoint = argv.bin
      ? resolveBinScript(argv.entrypoint, { from: argv.root })
      : resolveEntrypoint(argv.entrypoint, argv.root)
    if (entrypoint !== argv.entrypoint) {
      // note: this will print if the original entrypoint is a relative path; we
      // may or may not want to continue displaying it for that specific case.
      log.warning(`Resolved ${entrypoint} to ${argv.entrypoint}`)
    }
  }

  /**
   * @remarks
   * `yargs`' version guessing code seems to return the version provided by the
   * `package.json` at the workspace root--not the `package.json` in this
   * project. This is _probably_ not an issue anywhere other than in a dev
   * environment, but I wanted to make sure.
   */
  yargs(args)
    .parserConfiguration({
      /**
       * We deviate from yargs' default behavior by disabling
       * {@link https://github.com/yargs/yargs-parser#camel-case-expansion camel case expansion}.
       * This means an option such as `policy-override` will _not_ magically
       * become `policyOverride` in the parsed arguments object. The reason is
       * that we need to perform some post-processing of paths _in middleware_,
       * and it's easy to screw up if we have to do it twice for each option.
       * _Furthermore_, because `@types/yargs` expects camel-case expansion to
       * be enabled, the types are incorrect for the parameter to middleware and
       * handler (`argv`); it will include camel-cased properties where none
       * exist. My advice: just pretend they aren't there.
       */
      'camel-case-expansion': false,

      /**
       * This stuffs everything after the first `--` into its own array (in the
       * `--` prop of yargs' parsed arguments object). We will use this to
       * provide a "clean" `process.argv` for entrypoints.
       */
      'populate--': true,
    })
    .scriptName('lavamoat')
    .version(`${version}`)
    .epilog(
      // Careful with this string. yargs wants to word-wrap, and it uses a naïve
      // string length check instead of the functional ANSI width. In other
      // words: keep it short
      `Resources:

  🌋 ${terminalLink('LavaMoat on GitHub', repository)}
  🐛 Bugs? ${terminalLink('Issue tracker', bugs)}
  📖 Read ${terminalLink(`the LavaMoat docs`, homepage)}
`
    )
    .options({
      bin: {
        alias: ['b'],
        type: 'boolean',
        description: 'Resolve entrypoint as a bin script',
        global: true,
        group: BEHAVIOR_GROUP,
      },
      // the three policy options are used for both reading and writing
      policy: {
        alias: ['p'],
        describe: 'Filepath to a policy file',
        type: 'string',
        normalize: true,
        default: constants.DEFAULT_POLICY_PATH,
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
        default: constants.DEFAULT_POLICY_OVERRIDE_PATH,
        nargs: 1,
        requiresArg: true,
        global: true,
        group: PATH_GROUP,
      },
      'policy-debug': {
        describe: 'Filepath to a policy debug file',
        default: constants.DEFAULT_POLICY_DEBUG_PATH,
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
      dev: {
        describe: 'Include development dependencies',
        type: 'boolean',
        global: true,
        group: BEHAVIOR_GROUP,
      },
      verbose: {
        describe: 'Enable verbose logging',
        type: 'boolean',
        global: true,
        group: BEHAVIOR_GROUP,
      },
      quiet: {
        describe: 'Disable all logging',
        type: 'boolean',
        global: true,
        group: BEHAVIOR_GROUP,
      },
    })
    .conflicts('quiet', 'verbose')
    .middleware(
      /**
       * This resolves all paths from `cwd`.
       *
       * @remarks
       * This runs _before_ validation (second parameter).
       */
      (argv) => {
        argv.policy = path.resolve(argv.root, argv.policy)
        argv['policy-override'] = path.resolve(
          argv.root,
          argv['policy-override']
        )
        argv['policy-debug'] = path.resolve(argv.root, argv['policy-debug'])

        if (argv.verbose) {
          log.setLevel('debug')
        } else if (argv.quiet) {
          log.setLevel('emergency')
        }
      },
      true // RUN BEFORE CHECK FN
    )
    .check(
      /**
       * This validator is _global_ and runs before command-specific validators
       * (I think)
       */
      (argv) => {
        assertAbsolutePath(
          argv.root,
          `${em('root')} must be an absolute path; ${reportThisBug}`
        )
        assertAbsolutePath(
          argv.policy,
          `${em('policy')} must be an absolute path; ${reportThisBug}`
        )
        assertAbsolutePath(
          argv['policy-override'],
          `${em('policy-override')} must be an absolute path; ${reportThisBug}`
        )
        assertAbsolutePath(
          argv['policy-debug'],
          `${em('policy-debug')} must be an absolute path; ${reportThisBug}`
        )
        return true
      }
    )
    /**
     * Default command (no command)
     */
    .command(
      ['$0 <entrypoint>', 'run <entrypoint>'],
      'Run a Node.js application safely',
      (yargs) =>
        yargs
          .positional('entrypoint', {
            describe: 'Path to the application entry point; relative to --root',
            type: 'string',
            demandOption: true,
          })
          /**
           * These options are hidden because we don't want to encourage running
           * without inspecting the policy.
           *
           * These are intended for use with tests.
           *
           * @remarks
           * This call to `options()` is just a logical grouping to keep these
           * separate from the non-hidden options; i.e., it could have been just
           * a single call to `options()`.
           */
          .options({
            /**
             * @experimental
             */
            'generate-recklessly': {
              type: 'boolean',
              describe:
                'Generate & write a policy file on-the-fly [EXPERIMENTAL]',
              group: BEHAVIOR_GROUP,
              default: false,
              hidden: true,
            },
            /**
             * @experimental
             */
            write: {
              type: 'boolean',
              describe: 'Write policy file(s) to disk [EXPERIMENTAL]',
              group: BEHAVIOR_GROUP,
              implies: 'generate-recklessly',
              hidden: true,
            },
            /**
             * @experimental
             */
            debug: {
              type: 'boolean',
              describe: 'Additionally write a debug policy [EXPERIMENTAL]',
              group: BEHAVIOR_GROUP,
              implies: 'generate-recklessly',
              hidden: true,
            },
          })
          /**
           * Resolve entrypoint from `root`
           */
          .middleware(
            processEntrypointMiddleware,
            true // RUN BEFORE CHECK FN
          ),
      /**
       * Default command handler.
       *
       * @remarks
       * This is the "handler for the default command"—_not_ the "default
       * handler for a command" (there is no such beast)
       */
      async (argv) => {
        await Promise.resolve()
        const {
          'generate-recklessly': generate,
          entrypoint,
          debug,
          policy: policyPath,
          'policy-debug': policyDebugPath,
          'policy-override': policyOverridePath,
          dev,
          write,
        } = argv

        /**
         * This will be the policy merged with overrides, if present
         *
         * @type {LavaMoatPolicy}
         */
        let policy

        if (generate) {
          // let this reject since the failure mode could be any number of
          // terrible things
          policy = await generatePolicy(entrypoint, {
            debug,
            policyPath,
            policyDebugPath,
            write,
            dev,
          })
        } else {
          try {
            policy = await loadPolicies(policyPath, policyOverridePath)
          } catch (e) {
            const err = /** @type {NodeJS.ErrnoException} */ (e)
            if (err.code === 'ENOENT') {
              throw new Error(
                `Could not load policy from ${em(argv.policy)} and/or ${em(argv['policy-override'])}; reason:\n${err.message}`
              )
            }
            if (err.code === 'EISDIR') {
              // TODO: actually allow a directory and apply a default filename
              throw new Error(
                `Could not load policy from ${em(argv.policy)} and/or ${em(argv['policy-override'])}; specify a filepath instead of a directory`
              )
            }
            throw err
          }
        }

        stripProcessArgv(
          entrypoint,
          /**
           * `@types/yargs` doesn't know about this
           *
           * @type {(string | number)[]}
           */ (argv['--'])
        )

        await run(entrypoint, policy)
      }
    )
    .command(
      ['generate <entrypoint>', 'gen <entrypoint>'],
      'Generate a policy',
      (yargs) =>
        yargs
          .options({
            debug: {
              type: 'boolean',
              describe: 'Additionally write a debug policy',
              group: BEHAVIOR_GROUP,
              coerce: Boolean,
            },
            write: {
              describe:
                'Write policy file(s) to disk; if false, print to stdout',
              type: 'boolean',
              coerce: Boolean,
              default: true,
              group: BEHAVIOR_GROUP,
            },
          })
          .positional('entrypoint', {
            demandOption: true,
            describe: 'Application entry point',
            type: 'string',
          })
          .middleware(processEntrypointMiddleware, true),
      async ({
        entrypoint,
        debug,
        policy: policyPath,
        'policy-debug': policyDebugPath,
        dev,
        write,
      }) => {
        const policy = await generatePolicy(entrypoint, {
          debug,
          write,
          policyPath,
          policyDebugPath,
          dev,
        })

        if (debug) {
          log.info(`Wrote debug policy to ${policyDebugPath}`)
        }
        if (write) {
          log.info(`Wrote policy to ${policyPath}`)
        } else {
          // eslint-disable-next-line no-console
          console.log(jsonStringifySortedPolicy(policy))
        }
      }
    )
    .fail((msg, err, yargs) => {
      // `msg` is from yargs. if it's from yargs, we should probably just print
      // the help, because it is likely an invalid flag. `err` is from our code,
      // but that will only remain true as long as we keep throwing errors out
      // of `check` callbacks.
      if (err) {
        log.error(err)
      } else {
        yargs.showHelp()
        // if `msg` is undefined, then idk--might be a yargs bug?
        log.notice(msg ?? `unknown error - ${reportThisBug}`)
      }
      // this is recommended by the yargs docs, because `fail()` can be used to
      // salvage the process if failure happened before the command handler. if
      // I try really hard, I bet I can imagine a use-case, even. anyway, they
      // can't change it now.
      process.exit(1)
    })
    .showHelpOnFail(false)
    .demandCommand(1)
    .strict(true)
    .parse()
}

// void here means "ignore the return value". it's a Promise, if you must know.
void main()
