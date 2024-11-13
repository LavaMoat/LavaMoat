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
 *
 * Finally, we deviate from yargs' default behavior by disabling
 * {@link https://github.com/yargs/yargs-parser#camel-case-expansion camel case expansion}.
 * This means an option such as `policy-override` will _not_ magically become
 * `policyOverride` in the parsed arguments object. The reason is that we need
 * to perform some post-processing of paths _in middleware_, and it's easy to
 * screw up if we have to do it twice for each option. _Furthermore_, because
 * `@types/yargs` expects camel-case expansion to be enabled, the types are
 * incorrect for the parameter to middleware and handler (`argv`); it will
 * include camel-cased properties where none exist. My advice: just pretend they
 * aren't there.
 * @packageDocumentation
 */

import './preamble.js'

import chalk from 'chalk'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import terminalLink from 'terminal-link'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import * as constants from './constants.js'
import { log } from './log.js'
import { generateAndWritePolicy } from './policy-gen/index.js'
import { loadPolicies } from './policy.js'
import { run } from './run.js'
import { readJsonFile } from './util.js'

/**
 * @import {PackageJson} from 'type-fest';
 * @import {LavaMoatPolicy} from 'lavamoat-core';
 */

/**
 * "Behavior options" group name for `--help` output
 */
const BEHAVIOR_GROUP = 'Behavior Options:'

/**
 * Use this to give emphasis to words in error messages
 */
const em = chalk.yellow

/**
 * Main entry point to CLI
 */
const main = async (args = hideBin(process.argv)) => {
  // TODO: In Node.js v23, import attributes are no longer flagged as experimental.
  // use that instead of this. see https://nodejs.org/api/esm.html#import-attributes
  const {
    version,
    homepage,
    bugs: { url: bugs },
  } = /** @type {PackageJson & { homepage: string; bugs: { url: string } }} */ (
    await readJsonFile(new URL('../package.json', import.meta.url))
  )

  /**
   * Bug-reporting link for truly unexpected error messages
   */
  const reportThisBug = `please ${terminalLink('report this bug', bugs)}`

  /**
   * @remarks
   * `yargs`' version guessing code seems to return the version provided by the
   * `package.json` at the workspace root--not the `package.json` in this
   * project. This is _probably_ not an issue anywhere other than in a dev
   * environment, but I wanted to make sure.
   */
  yargs(args)
    .parserConfiguration({
      'camel-case-expansion': false,
    })
    .scriptName('lavamoat')
    .version(`${version}`)
    .epilog(
      `📖 Read the docs at ${terminalLink(homepage, homepage, { fallback: false })}\n`
    )
    .options({
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
      },
      'policy-debug': {
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
    .middleware(
      /**
       * This resolves all paths from `cwd`.
       *
       * @remarks
       * This runs _before_ validation (second parameter).
       */
      (argv) => {
        argv.policy = path.resolve(argv.cwd, argv.policy)
        argv['policy-override'] = path.resolve(
          argv.cwd,
          argv['policy-override']
        )
        argv['policy-debug'] = path.resolve(argv.cwd, argv['policy-debug'])
      },
      true
    )
    .check((argv) => {
      assert(
        path.isAbsolute(argv.cwd),
        `${em('cwd')} must be an absolute path; ${reportThisBug}`
      )
      assert(
        path.isAbsolute(argv.policy),
        `${em('policy')} must be an absolute path; ${reportThisBug}`
      )
      assert(
        path.isAbsolute(argv['policy-override']),
        `${em('policy-override')} must be an absolute path; ${reportThisBug}`
      )
      assert(
        path.isAbsolute(argv['policy-debug']),
        `${em('policy-debug')} must be an absolute path; ${reportThisBug}`
      )
      return true
    })
    /**
     * Default command (no command)
     */
    .command(
      ['$0 <entrypoint>', 'run <entrypoint>'],
      'Run a Node.js application safely using LavaMoat',
      (yargs) =>
        yargs
          .positional('entrypoint', {
            describe: 'Path to the application entry point; relative to --cwd',
            type: 'string',
            normalize: true,
          })
          .demandOption('entrypoint')
          /**
           * These options are hidden because we don't want to encourage running
           * without inspecting the policy.
           *
           * These are intended for use with tests.
           */
          .options({
            generate: {
              alias: ['g', 'gen'],
              type: 'boolean',
              describe: 'Generate policy file',
              group: BEHAVIOR_GROUP,
              default: false,
              hidden: true,
            },
            write: {
              type: 'boolean',
              describe: 'Write policy file(s) to disk',
              group: BEHAVIOR_GROUP,
              implies: 'generate',
              hidden: true,
            },
            debug: {
              type: 'boolean',
              describe: 'Additionally write a debug policy',
              group: BEHAVIOR_GROUP,
              implies: 'generate',
              hidden: true,
            },
          })
          /**
           * Resolve entrypoint from `cwd`
           */
          .middleware((argv) => {
            argv.entrypoint = path.resolve(argv.cwd, argv.entrypoint)
          }, true)
          .check((argv) => {
            assert(
              path.isAbsolute(argv.entrypoint),
              `${em('entrypoint')} must be an absolute path; ${reportThisBug}`
            )
            fs.accessSync(argv.entrypoint, fs.constants.R_OK),
              `File ${argv.entrypoint} does not exist or is not readable`
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
        const {
          generate,
          entrypoint,
          debug,
          policy: policyPath,
          'policy-debug': policyDebugPath,
          'policy-override': policyOverridePath,
          write,
        } = argv

        /** @type {LavaMoatPolicy} */
        let policy

        if (generate) {
          // let this reject since the failure mode is not obvious
          policy = await generateAndWritePolicy(entrypoint, {
            debug,
            policyPath,
            policyDebugPath,
            write,
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
            throw err
          }
        }

        await run(argv.entrypoint, policy)
      }
    )
    .command(
      ['gen <entrypoint>', 'generate <entrypoint>'],
      'Generate & write policy; overwrites existing file(s)',
      (yargs) =>
        yargs
          .options({
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
          .middleware(
            /**
             * Resolve entrypoint from `cwd`
             *
             * @remarks
             * This is run _before_ validation.
             */
            (argv) => {
              argv.entrypoint = path.resolve(argv.cwd, argv.entrypoint)
            },
            true
          )
          .check((argv) => {
            assert(
              path.isAbsolute(argv.entrypoint),
              `${em('entrypoint')} must be an absolute path; ${reportThisBug}`
            )
            fs.accessSync(argv.entrypoint, fs.constants.R_OK)
            return true
          }),
      async ({
        entrypoint,
        debug,
        policy: policyPath,
        'policy-debug': policyDebugPath,
      }) => {
        await generateAndWritePolicy(entrypoint, {
          debug,
          policyPath,
          policyDebugPath,
        })

        if (debug) {
          log.info(`Wrote debug policy to ${policyDebugPath}`)
        }
        log.info(`Wrote policy to ${policyPath}`)
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
