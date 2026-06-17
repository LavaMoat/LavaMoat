import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { escapeRegex } from './regex-escape.js'
/**
 * @import {
 *   AppliedChange,
 *   Change
 * } from "./types.js"
 */

/**
 * Reads an .npmrc file and returns its lines.
 *
 * @param {string} cwd
 * @returns {Promise<string[]>}
 */
async function readLegacyYarnrc(cwd) {
  try {
    const content = await readFile(join(cwd, '.yarnrc'), 'utf8')
    return content.split('\n')
  } catch {
    return []
  }
}

/**
 * Applies config entries to an .yarnrc file, merging with existing content.
 * Only overrides keys that are specified in entries.
 *
 * @param {string} cwd
 * @param {Change[]} entries
 * @param {boolean} [dryRun=false] If true, does not actually write any files,
 *   just returns the changes that would be made. Default is `false`
 * @returns {Promise<AppliedChange[]>} List of entries that were changed or
 *   added
 */
export async function applyLegacyYarnrc(cwd, entries, dryRun = false) {
  const lines = await readLegacyYarnrc(cwd)

  const changed = []

  for (const entry of entries) {
    const keyPattern = new RegExp(`^\\s*;?\\s*${escapeRegex(entry.key)}\\s*`)
    const existingIdx = lines.findIndex((line) => keyPattern.test(line))

    const strValue = String(entry.value)
    const newLine = `${entry.key} ${strValue}`
    const commentLine = entry.comment ? `## ${entry.comment}` : null

    if (existingIdx !== -1) {
      continue // This is a legacy fallback, we don't care
    } else {
      // Append new entry
      if (commentLine) {
        lines.push(commentLine)
      }
      lines.push(newLine)
      changed.push({ file: '.yarnrc', key: entry.key, value: strValue })
    }
  }

  // Ensure trailing newline
  const content = lines.join('\n').trimEnd() + '\n'
  if (!dryRun) {
    await writeFile(join(cwd, '.yarnrc'), content)
  }
  return changed
}
