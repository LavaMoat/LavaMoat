#!/usr/bin/env node

/**
 * CLI entry point for `lavax` — a secure `npx` replacement.
 *
 * @remarks
 * Importing {@link lavax} (from `./run.js`) imports `@lavamoat/node`, which
 * invokes SES `lockdown()` before any other module evaluates. This is
 * deliberate.
 * @packageDocumentation
 */

import { lavax } from './run.js'

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { splitArgs } from './args.js'
import { readJsonFile } from './fs.js'
import { log } from './log.js'

/**
 * @import {PackageJson} from 'type-fest'
 */

const BEHAVIOR_GROUP = 'Behavior Options:'
const PATH_GROUP = 'Path Options:'

/**
 * Main entry point to the CLI.
 *
 * @param {string[]} [args] CLI arguments
 * @returns {Promise<void>}
 */
const main = async (args = hideBin(process.argv)) => {
  const pkgJson = /** @type {PackageJson} */ (
    await readJsonFile(new URL('../package.json', import.meta.url))
  )
  const version = `${pkgJson.version}`

  // Everything after `<spec>` is forwarded to the package's bin, so we split
  // the argv ourselves and hand yargs only the leading options plus the spec.
  const { optionTokens, spec, forwardedArgs } = splitArgs(args)
  const yargsArgs = spec === undefined ? optionTokens : [...optionTokens, spec]

  await yargs(yargsArgs)
    .scriptName('lavax')
    .usage(
      '$0 [options] <spec> [args..]\n\nFetch and run a package’s bin under LavaMoat: install scripts are\ndisabled and a per-package SES policy is generated and enforced.'
    )
    .version(version)
    .command(
      '$0 <spec>',
      'Securely fetch and run a package bin',
      (yargs) =>
        yargs.positional('spec', {
          describe:
            'Package spec to fetch and run (e.g. "cowsay", "cowsay@1.5.0", "@scope/pkg")',
          type: 'string',
          demandOption: true,
        }),
      async (argv) => {
        if (argv.verbose) {
          log.setLevel('debug')
        } else if (argv.quiet) {
          log.setLevel('error')
        }

        try {
          await lavax(/** @type {string} */ (argv.spec), forwardedArgs, {
            call: /** @type {string | undefined} */ (argv.call),
            regenerate: /** @type {boolean | undefined} */ (argv.regenerate),
            force: /** @type {boolean | undefined} */ (argv.force),
            allowScripts: /** @type {boolean | undefined} */ (
              argv['allow-scripts']
            ),
            prodOnly: !argv.dev,
            registry: /** @type {string | undefined} */ (argv.registry),
            cacheDir: /** @type {string | undefined} */ (argv.cache),
            policyPath: /** @type {string | undefined} */ (argv.policy),
            quiet: /** @type {boolean | undefined} */ (argv.quiet),
          })
        } catch (err) {
          log.error(/** @type {Error} */ (err))
          process.exitCode = 1
        }
      }
    )
    .options({
      call: {
        alias: 'c',
        type: 'string',
        describe: 'Bin name to run (when the package exposes more than one)',
        group: BEHAVIOR_GROUP,
      },
      'allow-scripts': {
        type: 'boolean',
        default: false,
        describe:
          'DANGEROUS: allow lifecycle (install) scripts to run during install',
        group: BEHAVIOR_GROUP,
      },
      regenerate: {
        type: 'boolean',
        default: false,
        describe: 'Regenerate the LavaMoat policy instead of reusing the cache',
        group: BEHAVIOR_GROUP,
      },
      force: {
        type: 'boolean',
        default: false,
        describe: 'Reinstall the package even if a cached install exists',
        group: BEHAVIOR_GROUP,
      },
      dev: {
        type: 'boolean',
        default: false,
        describe: 'Include dev dependencies / use the "development" condition',
        group: BEHAVIOR_GROUP,
      },
      registry: {
        type: 'string',
        describe: 'npm registry URL to install from',
        group: PATH_GROUP,
      },
      cache: {
        type: 'string',
        normalize: true,
        describe:
          'Cache base directory (default: $LAVAMOAT_RUN_CACHE or ~/.lavamoat/run)',
        group: PATH_GROUP,
      },
      policy: {
        alias: 'p',
        type: 'string',
        normalize: true,
        describe: 'Path to a policy file (default: within the cache directory)',
        group: PATH_GROUP,
      },
      verbose: {
        type: 'boolean',
        describe: 'Enable verbose logging',
        group: BEHAVIOR_GROUP,
      },
      quiet: {
        type: 'boolean',
        describe: 'Disable all but error logging',
        group: BEHAVIOR_GROUP,
      },
    })
    .conflicts('quiet', 'verbose')
    .epilog(
      `Security model:
  • Install scripts are disabled by default (override with --allow-scripts)
  • The package bin runs inside Hardened JavaScript (SES lockdown)
  • Access to globals & builtins is restricted by a generated per-package policy

  🌋 https://github.com/LavaMoat/LavaMoat`
    )
    .fail((msg, err, yargs) => {
      if (err) {
        log.error(err)
      } else {
        yargs.showHelp()
        log.notice(msg)
      }
      process.exit(1)
    })
    .strict(false)
    .demandCommand(1)
    .parseAsync()
}

void main()
