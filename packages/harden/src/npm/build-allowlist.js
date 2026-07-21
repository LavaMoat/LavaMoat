import { promisify } from 'node:util'
import child_process from 'node:child_process'
const execFile = promisify(child_process.execFile)
/**
 * @import {
 *   Change,
 *   Decisions,
 *   Facts,
 *   PrintApi
 * } from "../tools/types.js"
 */

/**
 * @typedef {Object} NpmApproveOutput
 * @property {{ name: string; changes: { key: string }[] }[]} allowScripts
 */

/**
 * Parses stdout from `npm approve-scripts --json`.
 *
 * @param {string} stdout
 * @returns {string[]}
 */
function parseAllowScripts(stdout) {
  try {
    /** @type {NpmApproveOutput} */
    const parsed = JSON.parse(stdout)
    if (
      Array.isArray(parsed.allowScripts) &&
      parsed.allowScripts.length > 0
    ) {
      return parsed.allowScripts.map((entry) => entry.changes[0].key)
    }
  } catch {
    // stdout can be plain text when nothing is found
  }
  return []
}

/**
 * Discover packages with pending lifecycle scripts via npm approve-scripts.
 *
 * @param {string} cwd
 * @param {PrintApi} print
 * @returns {Promise<string[]>}
 */
async function discoverPendingScripts(cwd, print) {
  try {
    const { stdout } = await execFile(
      'npm',
      [
        'approve-scripts',
        '--ignore-scripts=false',
        '--allow-scripts-pending',
        '--json',
      ],
      { cwd }
    )
    return parseAllowScripts(stdout)
  } catch (err) {
    const stdout = /** @type {{ stdout?: string } | undefined} */ (err)?.stdout
    if (stdout) {
      return parseAllowScripts(stdout)
    }
    print(Error(`Failed to execute npm approve-scripts: ${err}`))
  }
  return []
}

/**
 * Build the allowlist for approved lifecycle scripts.
 *
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @param {PrintApi} print
 * @returns {Promise<Change[]>}
 */
export async function buildAllowlistChanges(facts, decisions, print) {
  const denyAll = await decisions.askToHarden(
    {
      description: "Don't approve existing install scripts. ",
      level: 'paranoid',
    },
    facts
  )

  if (denyAll) {
    print(
      `No install scripts were approved. You can allow specific ones using 'npm approve-scripts'.`
    )
  }

  try {
    const approvedScripts = await discoverPendingScripts(facts.cwd, print)
    if (approvedScripts.length === 0) {
      return []
    }

    print(
      `Approved lifecycle scripts for direct dependencies: [${approvedScripts}]. You can review and adjust them later in package.json.`
    )
    return approvedScripts.map((scriptName) => ({
      target: 'package.json',
      key: ['allowScripts', scriptName],
      value: !denyAll,
    }))
  } catch (err) {
    print(Error(`Failed to execute npm approve-scripts: ${err}`))
  }
  return []
}
