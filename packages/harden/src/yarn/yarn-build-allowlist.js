import {
  ensureWorkspaceInitialized,
  findPackagesWithScripts,
} from './yarn-internals.js'
/**
 * @import {
 *   Change,
 *   Decisions,
 *   Facts,
 *   PrintApi
 * } from "../tools/types.js"
 */

/**
 * Build the allowlist for approved lifecycle scripts. Yarn uses
 * `dependenciesMeta` in package.json to control which packages are allowed to
 * run install scripts.
 *
 * @param {Facts} facts
 * @param {Decisions} decisions
 * @param {PrintApi} print
 * @returns {Promise<Change[]>}
 */
export async function buildAllowlistChanges(facts, decisions, print) {
  const denyAll =
    decisions.askToHarden &&
    (await decisions.askToHarden(
      {
        description: "Don't approve existing install scripts. ",
      },
      facts
    ))

  if (!facts.hasYarnState) {
    if (denyAll) {
      return []
    }
    ensureWorkspaceInitialized(facts, print)
  }

  const allBuilds = await findPackagesWithScripts(facts)

  if (!denyAll) {
    print(
      `Approved packages with lifecycle scripts: [${allBuilds.map((pkg) => pkg.name).join(', ')}] .`
    )
  }

  if (allBuilds.length === 0) {
    return []
  }

  const dependenciesMeta = Object.fromEntries(
    allBuilds.map((pkg) => [pkg.name, { built: !denyAll }])
  )

  return [
    {
      target: 'package.json',
      key: 'dependenciesMeta',
      value: dependenciesMeta,
      comment:
        'List of packages with lifecycle scripts that are allowed to run.',
    },
  ]
}
