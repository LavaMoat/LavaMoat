import semver from 'semver'
/**
 * @import {
 *   Change,
 *   Facts,
 *   SerializableObject
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

  /** @type {string | undefined} */
  let targetVersion
  const [pmPrefix, minimum] = String(entry.value).split('@')
  if (facts.packageJson?.packageManager) {
    if (typeof facts.packageJson.packageManager !== 'string') {
      throw Error(
        `Expected packageManager field in package.json to be a string, got ${typeof facts.packageJson.packageManager}`
      )
    }
    const currentVersion = facts.packageJson.packageManager.split('@')[1]
    if (
      currentVersion &&
      semver.valid(currentVersion) &&
      semver.valid(minimum) &&
      semver.gte(currentVersion, minimum)
    ) {
      // Keep already-stronger configuration rather than falling back to baseline.
      targetVersion = currentVersion
    }
  }

  if (!targetVersion) {
    targetVersion = latestVersion
    entry.value = `${pmPrefix}@${targetVersion}`
    delete entry.ifNotExist
  }

  const devEnginesEntry = changes.find(
    (c) => c.target === 'package.json' && c.key === 'devEngines'
  )
  const devEnginesValue = /** @type {SerializableObject | null} */ (
    devEnginesEntry?.value
  )
  if (devEnginesEntry && devEnginesValue?.packageManager) {
    const pm = /** @type {SerializableObject} */ (
      devEnginesValue.packageManager
    )
    devEnginesEntry.value = {
      ...devEnginesValue,
      packageManager: {
        ...pm,
        version: `>=${targetVersion}`,
      },
    }
  }

  return changes
}
