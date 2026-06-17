import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { parseDocument } from 'yaml'
/**
 * @import {
 *   AppliedChange,
 *   Change
 * } from "./types.js"
 */

const yamlDocumentCache = new Map()
/**
 * Reads a YAML file and returns a parsed document. Returns an empty document if
 * the file does not exist. memoized to avoid multiple reads of the same file
 * during a run
 *
 * @param {string} filePath
 * @param {string} [key] - Unique key to cache the document by
 * @returns {Promise<import('yaml').Document>}
 */
export async function readYamlDocument(filePath, key) {
  if (key && yamlDocumentCache.has(key)) {
    return yamlDocumentCache.get(key)
  }

  try {
    const content = await readFile(filePath, 'utf8')
    const doc = parseDocument(content)
    if (key) {
      yamlDocumentCache.set(key, doc)
    }
    return doc
  } catch {
    const doc = parseDocument('')
    if (key) {
      yamlDocumentCache.set(key, doc)
    }
    return doc
  }
}

/**
 * Reads a YAML document field and returns it as an array.
 *
 * @param {import('yaml').Document} doc
 * @param {string} fieldName
 * @returns {unknown[]}
 */
export function readYamlArrayField(doc, fieldName) {
  const value = doc.get(fieldName)
  const yamlValue = /** @type {{ toJSON?: () => unknown } | null} */ (value)

  if (!yamlValue || typeof yamlValue.toJSON !== 'function') {
    return []
  }

  const arrayValue = yamlValue.toJSON()
  return Array.isArray(arrayValue) ? arrayValue : []
}

/**
 * Applies config entries to a YAML file, merging with existing content.
 *
 * @param {string} cwd
 * @param {string} filename - E.g. '.yarnrc.yml' or 'pnpm-workspace.yaml'
 * @param {Change[]} entries
 * @param {boolean} [dryRun=false] If true, does not actually write any files,.
 *   Default is `false`
 * @returns {Promise<AppliedChange[]>} List of entries that were changed or
 *   added
 */
export async function applyYamlConfig(cwd, filename, entries, dryRun = false) {
  const filePath = join(cwd, filename)
  const doc = await readYamlDocument(
    filePath,
    // forget changes from dryRun when actually running
    `${filePath}${dryRun ? ':dryRun' : ''}`
  )

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
      const items = /** @type {any[]} */ (doc.contents.items)
      const pair = items.find(
        (/** @type {any} */ item) => (item.key?.value ?? item.key) === entry.key
      )
      if (pair && typeof pair === 'object' && 'key' in pair) {
        // Ensure the key is a Scalar node so commentBefore works
        if (typeof pair.key === 'string') {
          pair.key = doc.createNode(pair.key)
        }
        /** @type {{ commentBefore?: string }} */ pair.key.commentBefore = ` ${entry.comment}`
      }
    }

    changed.push({ file: filename, key: entry.key, value: entry.value })
  }

  if (!dryRun) {
    await writeFile(filePath, doc.toString())
  }
  return changed
}
