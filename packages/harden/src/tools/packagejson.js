import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * @import {
 *   AppliedChange,
 *   Change as PackageJsonEntry
 * } from "./types.js"
 */

/**
 * Applies entries to package.json using deep path keys (e.g. ['devEngines',
 * 'packageManager', 'name']). String keys are treated as literal top-level
 * keys.
 *
 * @param {string} cwd
 * @param {PackageJsonEntry[]} entries
 * @param {boolean} [dryRun=false] If true, does not actually write any files,
 *   just returns the changes that would be made. Default is `false`
 * @returns {Promise<AppliedChange[]>} List of entries that were changed or
 *   added
 */
export async function applyPackageJson(cwd, entries, dryRun = false) {
  const filePath = join(cwd, 'package.json')
  let content
  try {
    content = await readFile(filePath, 'utf8')
  } catch {
    return []
  }

  const pkg = JSON.parse(content)
  const changed = []

  for (const entry of entries) {
    const parts = Array.isArray(entry.key) ? entry.key : [entry.key]
    let target = pkg
    for (let i = 0; i < parts.length - 1; i++) {
      if (
        target[parts[i]] === undefined ||
        typeof target[parts[i]] !== 'object'
      ) {
        target[parts[i]] = {}
      }
      target = target[parts[i]]
    }
    const lastKey = parts[parts.length - 1]
    const existingValue = target[lastKey]

    if (entry.ifNotExist && existingValue !== undefined) {
      continue
    }

    if (JSON.stringify(existingValue) === JSON.stringify(entry.value)) {
      continue
    }

    target[lastKey] = entry.value
    changed.push({ file: 'package.json', key: entry.key, value: entry.value })
  }

  // Detect indentation from original file
  const indentMatch = content.match(/^(\s+)"/m)
  const indent = indentMatch ? indentMatch[1].length : 2

  if (!dryRun) {
    await writeFile(filePath, JSON.stringify(pkg, null, indent) + '\n')
  }
  return changed
}
