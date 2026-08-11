import {
  copyFile,
  mkdir,
  access,
  readFile,
  writeFile,
  chmod,
} from 'node:fs/promises'
import { constants } from 'node:fs'
import { join, dirname } from 'node:path'
/**
 * @import {
 *   AppliedChange,
 *   Change
 * } from "./types.js"
 */

const __dirname = import.meta.dirname
const templateDir = join(__dirname, '..', 'template', 'lavamoat')

/**
 * Returns true when writing the given string entry would be a no-op.
 *
 * @param {string} dest
 * @param {string} value
 * @param {boolean} overwrite
 * @returns {Promise<boolean>}
 */
async function shouldSkipStringEntry(dest, value, overwrite) {
  try {
    const existing = await readFile(dest, 'utf-8')
    if (existing === value) {
      return true
    }
    return overwrite ? false : true
  } catch {
    // file does not exist yet, proceed to write
    return false
  }
}

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
      if (typeof entry.value === 'string') {
        if (await shouldSkipStringEntry(dest, entry.value, overwrite)) {
          continue
        }
      } else {
        try {
          await access(dest, constants.F_OK)
          if (!overwrite) {
            continue
          }
        } catch {
          // file does not exist, proceed
        }
      }
    } else {
      await mkdir(dirname(dest), { recursive: true })
      if (typeof entry.value === 'string') {
        if (await shouldSkipStringEntry(dest, entry.value, overwrite)) {
          continue
        }
        try {
          await writeFile(dest, entry.value, {
            encoding: 'utf-8',
            flag: overwrite ? 'w' : 'wx',
          })
          // String-based entries are generated scripts/plugins and should be
          // executable when materialized on disk. No-op on windows.
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
      value:
        typeof entry.value === 'string'
          ? entry.value.substring(0, 50)
          : entry.value,
    })
  }

  return applied
}
