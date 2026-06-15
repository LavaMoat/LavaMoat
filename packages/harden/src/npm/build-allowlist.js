import { promisify } from 'node:util'
import child_process from 'node:child_process'
const execFile = promisify(child_process.execFile)
/**
 * @import {
 *   Change,
 *   Decisions,
 *   Facts
 * } from "../tools/types.js"
 */

/**
 * @typedef {Object} NpmApproveOutput
 * @property {{ changes: { key: string }[] }[]} allowScripts
 */

/**
 * Build the allowlist for approved lifecycle scripts.
 *
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @returns {Promise<Change[]>}
 */
export async function buildAllowlistChanges(facts, decisions) {
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
    return []
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
    /** @type {string[]} */
    let approvedScripts = []
    // if stdout parses as json and contains a field "allowScripts" with a non-empty array, it worked. Otherwise, assume no scripts were found.
    // https://github.com/npm/cli/issues/9529
    try {
      /** @type {NpmApproveOutput} */
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
    return [
      {
        target: 'package.json',
        key: 'allowScripts',
        value: Object.fromEntries(approvedScripts.map((s) => [s, true])),
      },
    ]
  } catch (err) {
    console.warn(`Failed to execute npm approve-scripts:`, err)
  }
  return []
}
