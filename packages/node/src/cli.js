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

import { jsonStringifySortedPolicy } from 'lavamoat-core'
import fs from 'node:fs'
import path from 'node:path'
import terminalLink from 'terminal-link'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as constants from './constants.js'
import { run } from './exec/run.js'
import { readJsonFile } from './fs.js'
import { log } from './log.js'
import { generatePolicy } from './policy-gen/generate.js'
import { loadPolicies } from './policy-util.js'
import { resolveBinScript, resolveEntrypoint } from './resolve.js'
import { hrPath, toPath } from './util.js'

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
 * @param {string} entrypoint
 * @returns {boolean}
 */
const shouldTrustRoot = (entrypoint) => {
  return !entrypoint.includes('node_modules')
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
    await readJsonFile(toPath(new URL('../package.json', import.meta.url)))
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
   *
   * In other words, this is here to avoid the inevitable future bug when a new
   * command is added.
   * @param {{
   *   entrypoint: string
   *   bin?: boolean
   *   'project-root': string
   * }} argv
   *   Subset of arguments
   * @returns {void}
   */
  const processEntrypointMiddleware = (argv) => {
    const { entrypoint, 'project-root': projectRoot } = argv
    argv.entrypoint = argv.bin
      ? resolveBinScript(argv.entrypoint, { from: projectRoot })
      : resolveEntrypoint(argv.entrypoint, { from: projectRoot })
    const niceOriginalEntrypoint = hrPath(argv.entrypoint)
    const niceResolvedEntrypoint = hrPath(entrypoint)
    if (niceResolvedEntrypoint !== niceOriginalEntrypoint) {
      log.warning(
        `Resolved ${niceResolvedEntrypoint} → ${niceResolvedEntrypoint}`
      )
    }
  }

  /**
   * @remarks
   * `yargs`' version guessing code seems to return the version provided by the
   * `package.json` at the workspace root--not the `package.json` in this
   * project. This is _probably_ not an issue anywhere other than in a dev
   * environment, but I wanted to make sure.
   */
  await yargs(args)
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

      // #region path args

      /**
       * The three `policy*` options below are used for both reading and
       * writing.
       *
       * Note that `coerce: path.resolve` is _only_ appropriate for the `root`
       * option, as the others are computed from it!
       */

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
        defaultDescription: `"${constants.DEFAULT_POLICY_OVERRIDE_PATH}"`,
        nargs: 1,
        requiresArg: true,
        global: true,
        group: PATH_GROUP,
      },
      'policy-debug': {
        describe: 'Filepath to a policy debug file',
        defaultDescription: `"${constants.DEFAULT_POLICY_DEBUG_PATH}"`,
        nargs: 1,
        type: 'string',
        requiresArg: true,
        global: true,
        group: PATH_GROUP,
      },
      'project-root': {
        alias: ['root'],
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
       * This _global_ middleware:
       *
       * - Resolves `policy` from `project-root`
       * - If `policy-override` was provided, resolve it from `project-root` and
       *   asserts it is readable. It's appropriate to do so here because it is
       *   impossible to answer "did the user provide an explicit policy
       *   override path?" _after_ this point. We throw an exception if the
       *   explicitly-provide policy override path is not readable. This applies
       *   to both `run` and `generate` commands; both will read the policy
       *   override file, if present.
       * - Configures the global logger based on `verbose` and `quiet` flags (this
       *   overrides the `LAVAMOAT_DEBUG` environment variable, if present; the
       *   environment variable can be used when consuming `@lavamoat/node`
       *   programmatically)
       */
      async (argv) => {
        await Promise.resolve()

        // this is absolute
        const projectRoot = argv['project-root']

        // TODO: this mini-algorithm should be extracted to a function since it's used elsewhere too
        argv['policy-debug'] = argv['policy-debug']
          ? path.resolve(projectRoot, argv['policy-debug'])
          : path.join(
              path.dirname(argv.policy),
              constants.DEFAULT_POLICY_DEBUG_FILENAME
            )
        argv.policy = path.resolve(projectRoot, argv.policy)

        if (argv['policy-override']) {
          const policyOverridePath = path.resolve(
            projectRoot,
            argv['policy-override']
          )
          try {
            await fs.promises.access(policyOverridePath, fs.constants.R_OK)
            argv['policy-override'] = policyOverridePath
          } catch (err) {
            throw new Error(
              `Cannot read specified policy override file at path ${hrPath(policyOverridePath)}`,
              { cause: err }
            )
          }
        }
        if (argv.verbose) {
          log.setLevel('debug')
        } else if (argv.quiet) {
          // This assumes that we will never use the "emergency" log level!
          log.setLevel('emergency')
        }
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
            describe:
              'Path to the application entry point; relative to --project-root',
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
            scuttle: {
              type: 'boolean',
              describe: 'Enable scuttling of globalThis',
              group: BEHAVIOR_GROUP,
              coerce: Boolean,
            },
          })
          /**
           * Resolve entrypoint from `project-root`
           */
          .middleware(processEntrypointMiddleware),
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
          'project-root': projectRoot,
          scuttle: scuttleGlobalThis,
          write,
        } = argv

        const trustRoot = shouldTrustRoot(entrypoint)
        if (!trustRoot) {
          log.info(
            `Real path of the entrypoint is in a ${hrPath('node_modules/')} directory and is considered untrusted; expecting a policy containing an untrusted root`
          )
        }

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
            policyOverridePath,
            write,
            dev,
            trustRoot,
            projectRoot,
          })
        } else {
          policy = await loadPolicies(policyPath, {
            policyOverridePath,
            projectRoot,
          })
        }

        stripProcessArgv(
          entrypoint,
          /**
           * `@types/yargs` doesn't know about this
           *
           * @type {(string | number)[]}
           */ (argv['--'])
        )

        await run(entrypoint, policy, {
          policyOverridePath,
          trustRoot,
          dev,
          projectRoot,
          scuttleGlobalThis,
        })
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
          .middleware(processEntrypointMiddleware),
      async ({
        entrypoint,
        debug,
        policy: policyPath,
        'policy-debug': policyDebugPath,
        'policy-override': policyOverridePath,
        dev,
        write,
      }) => {
        const trustRoot = shouldTrustRoot(entrypoint)
        if (!trustRoot) {
          log.info(
            `Real path of the entrypoint is in a ${hrPath('node_modules/')} directory and is considered untrusted; an policy containing an untrusted root will be generated`
          )
        }

        const policy = await generatePolicy(entrypoint, {
          debug,
          write,
          policyPath,
          policyDebugPath,
          policyOverridePath,
          dev,
          trustRoot,
        })

        if (!write) {
          // console used here since the logger only uses stderr
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
    .parseAsync()
}

// void here means "ignore the return value". it's a Promise, if you must know.
void main()
