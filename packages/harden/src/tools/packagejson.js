// @ts-check
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * @typedef {{ key: string; value: any; ifNotExist?: boolean }} PackageJsonEntry
 */

/**
 * Applies entries to package.json using deep path keys (e.g.
 * "devEngines.packageManager.name").
 *
 * @param {string} cwd
 * @param {PackageJsonEntry[]} entries
 * @returns {Promise<string[]>} List of keys that were changed or added
 */
export async function applyPackageJson(cwd, entries) {
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
    const parts = entry.key.split('.')
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
    changed.push(entry.key)
  }

  // Detect indentation from original file
  const indentMatch = content.match(/^(\s+)"/m)
  const indent = indentMatch ? indentMatch[1].length : 2

  await writeFile(filePath, JSON.stringify(pkg, null, indent) + '\n')
  return changed
}
