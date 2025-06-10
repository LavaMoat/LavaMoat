import { Loggerr } from 'loggerr'
import fs from 'node:fs'
import path from 'node:path'
import * as constants from '../constants.js'
import { hrPath } from '../format.js'
import { log } from '../log.js'
import { resolveBinScript, resolveEntrypoint } from '../resolve.js'

/**
 * A middleware shared between `run` and `generate` commands.
 *
 * @remarks
 * It is too painful to use `yargs`'s types to determine the shape of the
 * expected options, so it needs to be done manually and kept in sync.
 * `entrypoint` is the only property here which is specific to a command; it
 * just so happens that both commands have idential `entrypoint` arguments
 * (positionals). All _other_ properties are defined as global options; if _all_
 * properties were global, this could just live in global middleware.
 *
 * In other words, this is here to avoid the inevitable future bug when a new
 * command is added.
 * @param {{
 *   entrypoint: string
 *   bin?: boolean
 *   root: string
 * }} argv Subset
 *   of arguments
 * @returns {void}
 */
export const resolveEntrypointMiddleware = (argv) => {
  const { entrypoint, root: projectRoot } = argv
  const resolvedEntrypoint = argv.bin
    ? resolveBinScript(argv.entrypoint, { from: projectRoot })
    : resolveEntrypoint(argv.entrypoint, projectRoot)
  const hrOriginalEntrypoint = hrPath(entrypoint)
  const hrResolvedEntrypoint = hrPath(resolvedEntrypoint)
  argv.entrypoint = resolvedEntrypoint
  if (hrOriginalEntrypoint !== hrResolvedEntrypoint) {
    log.warning(`Resolved ${hrOriginalEntrypoint} → ${hrResolvedEntrypoint}`)
  }
}

/**
 * This sets the log level based on the `verbose` and `quiet` flags.
 *
 * Note that this takes precedence over the `LAVAMOAT_DEBUG` env var, if set.
 *
 * @param {{ verbose?: boolean; quiet?: boolean }} argv
 * @returns {void}
 */
export const setLogLevelMiddleware = (argv) => {
  if (argv.verbose) {
    log.level = Loggerr.DEBUG
  } else if (argv.quiet) {
    // This assumes that we will never use the "emergency" log level!
    log.level = Loggerr.EMERGENCY
  }
}
/**
 * - Resolves `policy` from `project-root`
 * - If `policy-override` was provided, resolve it from `project-root` and asserts
 *   it is readable. It's appropriate to do so here because it is impossible to
 *   answer "did the user provide an explicit policy override path?" _after_
 *   this point. We throw an exception if the explicitly-provide policy override
 *   path is not readable. This applies to both `run` and `generate` commands;
 *   both will read the policy override file, if present.
 * - Configures the global logger based on `verbose` and `quiet` flags (this
 *   overrides the `LAVAMOAT_DEBUG` environment variable, if present; the
 *   environment variable can be used when consuming `@lavamoat/node`
 *   programmatically)
 *
 * @param {{
 *   root: string
 *   'policy-override'?: string
 *   'policy-debug'?: string
 *   policy: string
 * }} argv
 * @returns {Promise<void>}
 */
export const resolvePolicyPathsMiddleware = async (argv) => {
  await Promise.resolve()

  // this is absolute
  const { root: projectRoot } = argv

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
}
