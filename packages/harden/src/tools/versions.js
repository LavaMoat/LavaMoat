import semver from 'semver'
/**
 * @import {
 *   Change,
 *   Facts
 * } from "./types.js"
 */

/**
 * Applies the latest fetched version to the packageManager change entry, unless
 * the current version already meets the minimum declared in the change.
 *
 * @param {Change[]} changes
 * @param {Facts} facts
 * @param {string} latestVersion
 * @returns {Change[] | undefined}
 */
export function applyLatestVersion(changes, facts, latestVersion) {
  const entry = changes.find(
    (c) => c.target === 'package.json' && c.key === 'packageManager'
  )
  if (!entry) return
  const [pmPrefix, minimum] = String(entry.value).split('@')
  if (facts.packageJson?.packageManager) {
    if (typeof facts.packageJson.packageManager !== 'string') {
      throw Error(
        `Expected packageManager field in package.json to be a string, got ${typeof facts.packageJson.packageManager}`
      )
    }
    const currentVersion = facts.packageJson.packageManager.split('@')[1]
    if (currentVersion && semver.gte(currentVersion, minimum)) {
      return // already meets minimum, no change needed
    }
  }
  entry.value = `${pmPrefix}@${latestVersion}`
  return changes
}
