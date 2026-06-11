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
 * Build the allowlist for approved lifecycle scripts.
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

  if (denyAll) {
    console.log(
      `No install scripts were approved. You can allow specific ones using 'npm approve-scripts'.`
    )
  }

  try {
    const { stdout } = await execFile(
      'npm',
      [
        'approve-scripts',
        '--ignore-scripts=false',
        '--allow-scripts-pin',
        '--all',
        '--json',
      ],
      {
        cwd: facts.cwd,
      }
    )

    let nothingFound = true
    let approvedScripts = []
    // if stdout parses as json and contains a field "allowScripts" with a non-empty array, it worked. Otherwise, assume no scripts were found.
    // https://github.com/npm/cli/issues/9529
    try {
      const parsed = JSON.parse(stdout)
      if (
        parsed.allowScripts &&
        Array.isArray(parsed.allowScripts) &&
        parsed.allowScripts.length > 0
      ) {
        nothingFound = false
        approvedScripts = parsed.allowScripts.flatMap((s) =>
          s.changes.map((c) => c.key)
        )
      }
    } catch {
      // ignore parse errors and assume nothing found
    }
    if (nothingFound) {
      return []
    }

    console.log(
      `Approved lifecycle scripts for direct dependencies: [${approvedScripts}]. You can review and adjust them later in package.json.`
    )
    const changes = [
      {
        file: 'package.json',
        key: 'allowScripts',
        value: Object.fromEntries(approvedScripts.map((s) => [s, true])),
      },
    ]

    return changes
  } catch (err) {
    console.warn(`Failed to execute npm approve-scripts:`, err)
  }
}
