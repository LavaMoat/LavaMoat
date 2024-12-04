import { memfs } from 'memfs'
import { fromJsonSnapshot } from 'memfs/lib/snapshot/index.js'
import { Volume } from 'memfs/lib/volume.js'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { makeReadPowers } from '../src/power.js'
import { isString } from '../src/util.js'

/**
 * @import {ReadNowPowers, FsInterface} from '@endo/compartment-mapper'
 * @import {DirectoryJSON} from 'memfs'
 * @import {SnapshotNode} from 'memfs/lib/snapshot/types.js'
 * @import {JsonUint8Array} from 'memfs/lib/snapshot/json.js'
 * @import {ExecFileException} from 'node:child_process'
 * @import {CompactJSON, RunCliOutput} from './types.js'
 */

const execFileAsync = promisify(execFile)
const { isArray } = Array

const encoder = new TextEncoder()

/**
 * Populates a fixture with `content` as the file content of the entry point of
 * a dependency.
 *
 * Works similarly to `lavamoat-core/test/util`'s `createConfigForTest`--except
 * `content` cannot be a function.
 *
 * @param {string | Buffer} content
 * @param {{ sourceType?: 'module' | 'script' }} [options]
 * @returns {Promise<{
 *   vol: Volume
 *   readPowers: ReadNowPowers
 * }>}
 */
export async function scaffoldFixture(content, { sourceType = 'module' } = {}) {
  const fixture =
    sourceType === 'module'
      ? './fixture/json/scaffold-module.json'
      : './fixture/json/scaffold-script.json'
  const { vol, readPowers } = await loadJSONFixture(
    new URL(fixture, import.meta.url)
  )

  vol.fromJSON({ '/node_modules/test/index.js': content })

  return { vol, readPowers }
}

/**
 * Creates a `Volume` from a "Compact JSON" snapshot.
 *
 * @param {CompactJSON | JsonUint8Array<SnapshotNode>} snapshotJson - "Compact
 *   JSON" snapshot
 * @returns {Promise<Volume>} New `Volume`
 */
async function createVolFromSnapshot(snapshotJson) {
  const { vol } = memfs()

  // XXX: something makes me think I'm doing something wrong here, because
  // shouldn't I just be able to create a snapshot from the JSON itself--instead
  // of a `Uint8Array`?
  const buf = /** @type {JsonUint8Array<SnapshotNode>} */ (
    snapshotJson instanceof Uint8Array
      ? snapshotJson
      : encoder.encode(JSON.stringify(snapshotJson))
  )

  await fromJsonSnapshot(buf, { fs: vol.promises, path: '/' })
  return vol
}

/**
 * Loads a fixture JSON file or `DirectoryJSON` object or a "Compact JSON" value
 * and resolves w/ a `Volume` and `ReadFn`.
 *
 * If a "Compact JSON" value, it can be raw JSON or an encoded buffer thereof.
 *
 * Caches any JSON loaded from disk.
 *
 * @param {string
 *   | URL
 *   | DirectoryJSON
 *   | CompactJSON
 *   | JsonUint8Array<SnapshotNode>} pathOrJson
 *   Path to fixture JSON or directory object
 * @returns {Promise<{
 *   vol: Volume
 *   readPowers: ReadNowPowers
 * }>}
 * @todo Standardize entry point filename and return the entry point path.
 */
export async function loadJSONFixture(pathOrJson) {
  /** @type {Volume} */
  let vol
  await Promise.resolve()
  if (isString(pathOrJson) || pathOrJson instanceof URL) {
    if (loadJSONFixture.cache.has(pathOrJson)) {
      const json = loadJSONFixture.cache.get(pathOrJson)
      vol = isArray(json)
        ? await createVolFromSnapshot(json)
        : Volume.fromJSON(/** @type {DirectoryJSON} */ (json))
    } else {
      const filepath = pathOrJson
      const rawJson = await fs.promises.readFile(filepath, 'utf-8')
      const dirJson = JSON.parse(rawJson)
      loadJSONFixture.cache.set(pathOrJson, dirJson)
      vol = isArray(dirJson)
        ? await createVolFromSnapshot(dirJson)
        : Volume.fromJSON(dirJson)
    }
  } else {
    const json = pathOrJson
    vol = isArray(json)
      ? await createVolFromSnapshot(json)
      : Volume.fromJSON(/** @type {DirectoryJSON} */ (json))
  }

  const readPowers = makeReadPowers(/** @type {FsInterface} */ (vol))
  return { vol, readPowers }
}

/**
 * Parsed JSON cache. Can be a `DirectoryJSON` or CJSON snapshot
 *
 * @type {Map<string | URL, object>}
 */
loadJSONFixture.cache = new Map()

/**
 * Run the `@lavamoat/node` CLI with the provided arguments
 *
 * @param {string[]} args CLI arguments
 * @returns {Promise<RunCliOutput>}
 */
export const runCli = async (args) => {
  await Promise.resolve()

  /** @type {string} */
  let stdout
  /** @type {string} */
  let stderr
  /** @type {ExecFileException['code']} */
  let code

  try {
    ;({ stdout, stderr } = await execFileAsync(
      process.execPath,
      [CLI_PATH, ...args],
      { encoding: 'utf8' }
    ))
  } catch (err) {
    ;({ stdout, stderr, code } =
      /**
       * You'd think this type would be somewhere in `@types/node`, but it's
       * not. Why? There's no place in `Promise<T>` to define the rejection
       * type.
       *
       * @type {ExecFileException & {
       *   stdout: string
       *   stderr: string
       * }}
       */
      (err))
  }
  return { stdout, stderr, code }
}

/**
 * Path to the CLI entry point
 */

export const CLI_PATH = fileURLToPath(new URL('../src/cli.js', import.meta.url))
