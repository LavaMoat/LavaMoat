import { copyFile, mkdir, access, writeFile, chmod } from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
/**
 * @import {
 *   AppliedChange,
 *   Change
 * } from "./types.js"
 */

const __dirname = dirname(fileURLToPath(import.meta.url))
const templateDir = join(__dirname, '..', 'template', 'lavamoat')

/**
 * Ensures the ./lavamoat folder exists and writes/copies requested files into
 * it.
 *
 * @param {string} cwd
 * @param {Change[]} entries
 * @param {boolean} [dryRun=false] If true, does not actually write any files,
 *   just returns the changes that would be made. Default is `false`
 * @returns {Promise<AppliedChange[]>}
 */
export async function applyLavamoatFolder(cwd, entries, dryRun = false) {
  const destDir = join(cwd, 'lavamoat')
  await mkdir(destDir, { recursive: true })

  /** @type {AppliedChange[]} */
  const applied = []

  for (const entry of entries) {
    if (Array.isArray(entry.key)) {
      throw Error(
        'lavamoat folder entries must have string keys representing file paths'
      )
    }
    const dest = join(destDir, entry.key)
    const overwrite = entry.ifNotExist === true ? false : true
    if (dryRun) {
      try {
        await access(dest, constants.F_OK)
        continue
      } catch {
        // file does not exist, proceed
      }
    } else {
      await mkdir(dirname(dest), { recursive: true })
      if (typeof entry.value === 'string') {
        try {
          await writeFile(dest, entry.value, {
            encoding: 'utf-8',
            flag: overwrite ? 'w' : 'wx',
          })
          // String-based entries are generated scripts/plugins and should be
          // executable when materialized on disk. Noop on windows.
          await chmod(dest, 0o755)
        } catch (err) {
          if (/** @type {NodeJS.ErrnoException} */ (err).code === 'EEXIST') {
            continue
          }
          throw err
        }
      } else {
        const src = join(templateDir, entry.key)
        try {
          if (overwrite) {
            await copyFile(src, dest)
          } else {
            await copyFile(src, dest, constants.COPYFILE_EXCL)
          }
        } catch (err) {
          if (/** @type {NodeJS.ErrnoException} */ (err).code === 'EEXIST') {
            continue
          }
          throw err
        }
      }
    }
    applied.push({
      file: 'lavamoat/' + entry.key,
      key: entry.key,
      value: entry.value,
    })
  }

  return applied
}
