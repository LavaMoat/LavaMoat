import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDocument } from 'yaml'
/** @import {
  AppliedChange,
  Change
} from "./types.js" */

/**
 * Applies config entries to a YAML file, merging with existing content.
 *
 * @param {string} cwd
 * @param {string} filename - E.g. '.yarnrc.yml' or 'pnpm-workspace.yaml'
 * @param {Change[]} entries
 * @returns {Promise<AppliedChange[]>} List of entries that were changed or
 *   added
 */
export async function applyYamlConfig(cwd, filename, entries) {
  const filePath = join(cwd, filename)
  let doc
  try {
    const content = await readFile(filePath, 'utf8')
    doc = parseDocument(content)
  } catch {
    doc = parseDocument('')
  }

  const changed = []

  for (const entry of entries) {
    const existing = doc.get(entry.key)
    const valueToSet = entry.value

    if (
      existing !== undefined &&
      JSON.stringify(existing) === JSON.stringify(valueToSet)
    ) {
      continue // already correct
    }

    doc.set(entry.key, valueToSet)

    // Add comment above the key if provided
    if (entry.comment && doc.contents && 'items' in doc.contents) {
      const pair = doc.contents.items.find(
        (/** @type {any} */ item) => (item.key?.value ?? item.key) === entry.key
      )
      if (pair && 'key' in pair) {
        // Ensure the key is a Scalar node so commentBefore works
        if (typeof pair.key === 'string') {
          pair.key = doc.createNode(pair.key)
        }
        pair.key.commentBefore = ` ${entry.comment}`
      }
    }

    changed.push({ file: filename, key: entry.key, value: entry.value })
  }

  await writeFile(filePath, doc.toString())
  return changed
}
