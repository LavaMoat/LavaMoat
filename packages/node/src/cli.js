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
import { terminalLink } from '@lavamoat/vog'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as constants from './constants.js'
import { run } from './exec/run.js'
import { action, hrPath, seconds, success, stripAnsi } from './format.js'
import { readJsonFile } from './fs.js'
import { disableWarnings, log, LogLevels } from './log.js'
import { generatePolicy } from './policy-gen/generate.js'
import {
  policyInput as buildPolicyInput,
  policyOverrideAuto,
  policyOverrideNone,
  policyOverrideSourceFromFile,
  policySourceFromFile,
  policySourceFromInline,
} from './policy-input.js'
import { resolveBinScript, resolveEntrypoint } from './resolve.js'
import { toPath } from './util.js'
import { writePolicy, unwrapMerged } from './policy-util.js'

/**
 * @import {LavaMoatScuttleOpts} from "lavamoat-core"
 * @import {PackageJson} from "type-fest"
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
 * @returns {void}
 */
const stripProcessArgv = (entrypoint) => {
  /**
   * This module could be executed in myriad ways (`lavamoat`, `node
   * /path/to/lavamoat`, `npx lavamoat2`, etc.), so we are just going to
   * recreate the args from scratch
   */
  const start = 0

  const indexOfDoubleDash = process.argv.indexOf('--')

  /**
   * If the user provided `--` we want everything after that, but if they
   * didn't, the entire rest of the array is lavamoat args, so it can be
   * removed.
   */
  const deleteCount =
    indexOfDoubleDash !== -1 ? indexOfDoubleDash + 1 : process.argv.length

  /**
   * Path to `node`, any args to `node`, the path to the entrypoint, then
   * whatever was in {@link nonOptionArguments}. Hope this works!
   */
  const items = [process.execPath, ...process.execArgv, entrypoint]

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
    const resolvedEntrypoint = argv.bin
      ? resolveBinScript(argv.entrypoint, { from: projectRoot })
      : resolveEntrypoint(argv.entrypoint, { from: projectRoot })
    const niceOriginalEntrypoint = hrPath(entrypoint)
    const niceResolvedEntrypoint = hrPath(resolvedEntrypoint)
    argv.entrypoint = resolvedEntrypoint
    if (
      path.normalize(stripAnsi(niceResolvedEntrypoint)) !==
      path.normalize(stripAnsi(niceOriginalEntrypoint))
    ) {
      log.warn(
        `Resolved entrypoint ${niceOriginalEntrypoint} → ${niceResolvedEntrypoint}`
      )
    }
  }

  /**
   * Middleware to disable warnings if the `warnings` flag is falsy.
   *
   * @param {{ warnings?: boolean }} argv
   * @returns {void}
   */
  const disableWarningsMiddleware = ({ warnings }) => {
    if (!warnings) {
      disableWarnings()
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
    // #region global options
    .options({
      bin: {
        alias: ['b'],
        type: 'boolean',
        description: 'Resolve entrypoint as a bin script',
        global: true,
        group: BEHAVIOR_GROUP,
      },

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

      'prod-only': {
        describe: 'Exclude development dependencies',
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
      // #endregion
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
          log.level = LogLevels.debug
        } else if (argv.quiet) {
          log.level = LogLevels.silent
        }
      }
    )
    // #region run
    /**
     * Default command (`run <entrypoint>`)
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
            'trust-root': {
              type: 'boolean',
              hidden: true,
              describe: 'Force trusting root compartment [EXPERIMENTAL]',
              group: BEHAVIOR_GROUP,
              coerce: Boolean,
            },
            /**
             * @experimental
             */
            'generate-recklessly': {
              type: 'boolean',
              describe:
                'Generate & write a policy file on-the-fly [EXPERIMENTAL]',
              group: BEHAVIOR_GROUP,
              hidden: true,
              coerce: Boolean,
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
              coerce: Boolean,
            },
            scuttle: {
              type: 'boolean',
              describe: 'Enable scuttling of globalThis',
              group: BEHAVIOR_GROUP,
              coerce:
                /**
                 * This is just about all we can do on the CLI without further
                 * options for a `LavaMoatScuttleOpts` object
                 *
                 * @param {boolean} value
                 * @returns {LavaMoatScuttleOpts}
                 */
                (value) => (value ? { enabled: true } : { enabled: false }),
            },
            warnings: {
              describe: 'Enable warnings',
              type: 'boolean',
              group: BEHAVIOR_GROUP,
              coerce: Boolean,
            },
          })
          .conflicts('quiet', 'warnings')
          /**
           * Resolve entrypoint from `project-root`
           */
          .middleware(processEntrypointMiddleware)
          .middleware(disableWarningsMiddleware),
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
          policy: policyPath,
          'policy-override': policyOverridePath,
          'prod-only': prodOnly,
          'project-root': projectRoot,
          scuttle: scuttleGlobalThis,
          write,
          'trust-root': trustRootFlag,
        } = argv

        const trustRoot =
          trustRootFlag !== undefined
            ? trustRootFlag
            : shouldTrustRoot(entrypoint)
        if (!trustRoot) {
          log.info(
            `Real path of the entrypoint is in a ${hrPath('node_modules/')} directory and is considered untrusted; expecting a policy containing an untrusted root`
          )
        }

        const input = buildPolicyInput({
          policy: policySourceFromFile(policyPath),
          override: policyOverridePath
            ? policyOverrideSourceFromFile(policyOverridePath)
            : policyOverrideAuto(projectRoot),
        })

        let runInput = input

        if (generate) {
          // let this reject since the failure mode could be any number of
          // terrible things
          const { policy } = await generatePolicy(entrypoint, {
            policies: input,
            prodOnly,
            trustRoot,
            projectRoot,
          })

          if (write) {
            await writePolicy(policyPath, unwrapMerged(policy))
          }

          // The generated policy is already merged; run directly from the
          // in-memory result to avoid a redundant disk round-trip.
          runInput = buildPolicyInput({
            policy: policySourceFromInline(unwrapMerged(policy)),
            override: policyOverrideNone(),
          })
        }

        stripProcessArgv(entrypoint)

        await run(entrypoint, {
          policies: runInput,
          trustRoot,
          prodOnly,
          projectRoot,
          scuttleGlobalThis,
        })
      }
    )
    // #endregion

    // #region generate
    /**
     * Generate command (`generate <entrypoint>`)
     */
    .command(
      ['generate <entrypoint>', 'gen <entrypoint>'],
      'Generate a policy',
      (yargs) =>
        yargs
          .options({
            write: {
              describe:
                'Write policy file(s) to disk; if false, print to stdout',
              type: 'boolean',
              coerce: Boolean,
              default: true,
              group: BEHAVIOR_GROUP,
            },
            'treat-warnings-as-errors': {
              describe:
                'Fail without emitting policy when warnings are present',
              type: 'boolean',
              coerce: Boolean,
              group: BEHAVIOR_GROUP,
            },
            warnings: {
              describe: 'Enable warnings',
              type: 'boolean',
              coerce: Boolean,
              group: BEHAVIOR_GROUP,
              hidden: true,
              default: true,
            },
            'no-warnings': {
              describe: 'Suppress warnings',
              type: 'boolean',
              coerce: Boolean,
              group: BEHAVIOR_GROUP,
            },
            'compact-overrides': {
              describe:
                'Remove redundant entries from existing policy override file & overwrite it',
              type: 'boolean',
              coerce: Boolean,
              group: BEHAVIOR_GROUP,
            },
          })
          .positional('entrypoint', {
            demandOption: true,
            describe: 'Application entry point',
            type: 'string',
          })
          .middleware(disableWarningsMiddleware)
          .middleware(processEntrypointMiddleware),
      async ({
        entrypoint,
        policy: policyPath,
        'policy-override': policyOverridePathArg,
        'prod-only': prodOnly,
        'project-root': projectRoot,
        'treat-warnings-as-errors': treatWarningsAsErrors,
        write: shouldWrite,
        'compact-overrides': compactOverrides,
      }) => {
        const startTime = Date.now()
        const trustRoot = shouldTrustRoot(entrypoint)
        if (!trustRoot) {
          log.info(
            `Real path of the entrypoint is in a ${hrPath('node_modules/')} directory and is considered untrusted; an policy containing an untrusted root will be generated`
          )
        }

        const input = buildPolicyInput({
          policy: policySourceFromFile(policyPath),
          override: policyOverridePathArg
            ? policyOverrideSourceFromFile(policyOverridePathArg)
            : policyOverrideAuto(projectRoot),
        })

        const {
          policy,
          hasWarnings,
          compactedPolicyOverride,
          policyOverridePath,
        } = await generatePolicy(entrypoint, {
          policies: input,
          prodOnly,
          trustRoot,
          compact: compactOverrides,
        })

        const duration = (Date.now() - startTime) / 1000
        log.info(
          `${success} Policy for ${hrPath(entrypoint)} ${action('generated')} in ${seconds(duration)}s`
        )

        if (hasWarnings && treatWarningsAsErrors) {
          process.exitCode = 1
          return
        }

        const rawPolicy = unwrapMerged(policy)

        if (shouldWrite) {
          await writePolicy(policyPath, rawPolicy)
          log.info(
            `${success} ${action('Wrote')} policy to ${hrPath(policyPath)}`
          )
        } else {
          // console used here since the logger only uses stderr
          // eslint-disable-next-line no-console
          console.log(jsonStringifySortedPolicy(rawPolicy))
        }

        if (compactOverrides) {
          if (compactedPolicyOverride && policyOverridePath) {
            await writePolicy(policyOverridePath, compactedPolicyOverride, {
              what: 'policy override',
            })
            log.info(
              `${success} ${action('Wrote')} compacted policy override to ${hrPath(policyOverridePath)}`
            )
          } else {
            log.warn(`No policy override file to compact; skipping compaction`)
          }
        }
      }
    )
    // #endregion
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
        log.warn(msg ?? `unknown error - ${reportThisBug}`)
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
