// @ts-check
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * @typedef {{ key: string; value: string; comment?: string }} NpmrcEntry
 */

/**
 * Reads an .npmrc file and returns its lines.
 *
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
async function readNpmrc(cwd) {
  try {
    const content = await readFile(join(cwd, '.npmrc'), 'utf8')
    return content.split('\n')
  } catch {
    return []
  }
}

/**
 * Applies config entries to an .npmrc file, merging with existing content. Only
 * overrides keys that are specified in entries.
 *
 * @param {string} cwd
 * @param {NpmrcEntry[]} entries
 * @returns {Promise<string[]>} List of keys that were changed or added
 */
export async function applyNpmrc(cwd, entries) {
  const lines = await readNpmrc(cwd)
  const changed = []

  for (const entry of entries) {
    const keyPattern = new RegExp(`^\\s*;?\\s*${escapeRegex(entry.key)}\\s*=`)
    const existingIdx = lines.findIndex((line) => keyPattern.test(line))

    const newLine = `${entry.key}=${entry.value}`
    const commentLine = entry.comment ? `## ${entry.comment}` : null

    if (existingIdx !== -1) {
      // Check if existing value differs
      const existingLine = lines[existingIdx]
      if (existingLine.trim() === newLine) {
        continue // already correct
      }
      // Replace the line, preserve or add comment above
      const prevIdx = existingIdx - 1
      if (commentLine) {
        if (prevIdx >= 0 && lines[prevIdx].startsWith('##')) {
          lines[prevIdx] = commentLine
        } else {
          lines.splice(existingIdx, 0, commentLine)
          // existingIdx shifted by 1
          lines[existingIdx + 1] = newLine
          changed.push(entry.key)
          continue
        }
      }
      lines[existingIdx] = newLine
      changed.push(entry.key)
    } else {
      // Append new entry
      if (commentLine) {
        lines.push(commentLine)
      }
      lines.push(newLine)
      changed.push(entry.key)
    }
  }

  // Ensure trailing newline
  const content = lines.join('\n').trimEnd() + '\n'
  await writeFile(join(cwd, '.npmrc'), content)
  return changed
}

/**
 * @param {string} str
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
