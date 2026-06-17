import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { readYamlArrayField, readYamlDocument } from '../tools/yaml-config.js'
/**
 * @import {
 *   Change,
 *   Decisions,
 *   Facts,
 *   PrintApi
 * } from "../tools/types.js"
 */

/**
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
        level: 'paranoid',
      },
      facts
    ))

  // read node_modules/.modules.yaml to list all packages with lifecycle scripts in pendingBuilds and ignoredBuilds
  const modulesYamlPath = join(facts.cwd, 'node_modules', '.modules.yaml')
  if (!existsSync(modulesYamlPath)) {
    print(
      `No node_modules found. Skipping lifecycle script allowlist generation.`
    )
    return []
  }
  const modulesYaml = await readYamlDocument(modulesYamlPath)
  const pendingBuilds = readYamlArrayField(modulesYaml, 'pendingBuilds')
  const ignoredBuilds = readYamlArrayField(modulesYaml, 'ignoredBuilds')
  const allBuilds = [...pendingBuilds, ...ignoredBuilds]

  if (!denyAll) {
    print(`Approved packages with lifecycle scripts: [${allBuilds}] .`)
  }

  const allowlist = Object.fromEntries(allBuilds.map((pkg) => [pkg, !denyAll]))

  return [
    {
      target: 'pnpm-workspace.yaml',
      key: 'allowBuilds',
      value: allowlist,
      comment:
        'List of packages with lifecycle scripts that are allowed to run.',
    },
  ]
}
