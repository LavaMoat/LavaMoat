// @ts-check
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDocument, stringify } from 'yaml'

/**
 * @typedef {{ key: string; value: any; comment?: string }} YamlEntry
 */

/**
 * Applies config entries to a YAML file, merging with existing content.
 *
 * @param {string} cwd
 * @param {string} filename - E.g. '.yarnrc.yml' or 'pnpm-workspace.yaml'
 * @param {YamlEntry[]} entries
 * @returns {Promise<string[]>} List of keys that were changed or added
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
    if (entry.comment) {
      const pair = doc.contents?.items?.find(
        (/** @type {any} */ item) => item.key?.value === entry.key
      )
      if (pair) {
        pair.key.commentBefore = ` ${entry.comment}`
      }
    }

    changed.push(entry.key)
  }

  await writeFile(filePath, doc.toString())
  return changed
}
