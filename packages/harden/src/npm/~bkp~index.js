import { opinions } from './opinions.js'
import { warnSkipped } from '../tools/print.js'
import { applyOpinion } from '../tools/apply-change.js'
import { promisify } from 'node:util'
import child_process from 'node:child_process'
const execFile = promisify(child_process.execFile)
/**
 * @import {
 *   AppliedChange,
 *   Decisions,
 *   Facts
 * } from "../tools/types.js"
 */

/**
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @returns {Promise<AppliedChange[]>}
 */
export async function reasonableDefaults(facts, decisions) {
  const result = []
  const askToHarden =
    decisions.askToHarden ?? ((_opinion, _facts) => Promise.resolve(null))

  for (const opinion of opinions) {
    if (!opinion.changes && !opinion.execute) {
      continue
    }

    const shouldApply = await decisions.shouldApplyOpinion(opinion, facts)
    if (!shouldApply) {
      continue
    }

    try {
      result.push(await applyOpinion(facts.cwd, opinion, facts, askToHarden))
    } catch (err) {
      warnSkipped(opinion, err)
    }
  }

  result.push(await buildAllowlist(facts, decisions))

  return result.flat()
}

/**
 * Parses stdout from `npm approve-scripts --json`. Returns an array of package
 * names if JSON with allowScripts is found, or `null` if output is not JSON
 * (e.g. plain text when nothing is found).
 *
 * @param {string} stdout
 * @returns {string[]}
 */
function parseAllowScripts(stdout) {
  try {
    const parsed = JSON.parse(stdout)
    if (
      parsed.allowScripts &&
      Array.isArray(parsed.allowScripts) &&
      parsed.allowScripts.length > 0
    ) {
      return parsed.allowScripts.map((s) => s.name)
    }
    return []
  } catch {
    // stdout is plain text — nothing found
    return []
  }
}

/**
 * Discover packages with pending lifecycle scripts via npm approve-scripts.
 *
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
async function discoverPendingScripts(cwd) {
  try {
    const { stdout } = await execFile(
      'npm',
      [
        'approve-scripts',
        /* work around a bug in 11.16.0*/ '--ignore-scripts=false',
        '--allow-scripts-pending',
        '--json',
      ],
      { cwd }
    )
    return parseAllowScripts(stdout)
  } catch (err) {
    // exit code 1 with JSON output is normal when there are pending scripts
    const stdout = /** @type {any} */ (err)?.stdout
    if (stdout) {
      const result = parseAllowScripts(stdout)
      if (result !== null) {
        return result
      }
    }
    console.warn(`Failed to discover pending scripts:`, err)
  }
  return []
}

/**
 * Build the allowlist for approved lifecycle scripts as an opinion applied to
 * package.json under allowScripts.
 *
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @returns {Promise<AppliedChange[]>}
 */
async function buildAllowlist(facts, decisions) {
  const denyAll =
    decisions.askToHarden &&
    (await decisions.askToHarden(
      {
        description: "Don't approve existing install scripts. ",
      },
      facts
    ))

  const allBuilds = await discoverPendingScripts(facts.cwd)
  process._rawDebug('harden:buildAllowlist', { allBuilds, denyAll })
  if (!denyAll) {
    console.log(`Approved packages with lifecycle scripts: [${allBuilds}] .`)
    return []
  }

  // put the list of packages with lifecycle scripts in allowScripts in package.json
  const allowlist = Object.fromEntries(allBuilds.map((pkg) => [pkg, !denyAll]))

  return applyOpinion(
    facts.cwd,
    {
      description: `Set allowScripts in package.json to allowlisted packages with lifecycle scripts.`,
      changes: [
        {
          target: 'package.json',
          key: 'allowScripts',
          value: allowlist,
          comment:
            'List of packages with lifecycle scripts that are allowed to run.',
        },
      ],
    },
    facts,
    () => Promise.resolve(true)
  )
}
