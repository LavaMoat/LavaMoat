import { memfs } from 'memfs'
import { fromJsonSnapshot } from 'memfs/lib/snapshot/index.js'
import { Volume } from 'memfs/lib/volume.js'
import fs from 'node:fs'
import { scheduler } from 'node:timers/promises'
import { makeReadPowers } from '../../src/compartment/power.js'
import { isString } from '../../src/util.js'

/**
 * @import {ReadNowPowers, FsInterface} from '@endo/compartment-mapper'
 * @import {DirectoryJSON} from 'memfs'
 * @import {SnapshotNode} from 'memfs/lib/snapshot/types.js'
 * @import {JsonUint8Array} from 'memfs/lib/snapshot/json.js'
 */

/**
 * Type guard for determining what kind of JSON fixture we have.
 *
 * This is _very_ loose, but the main difference is that the "Compact JSON"
 * format is a JSON array and `DirectoryJSON` is an JSON object. Further, the
 * former is always "compact" (like the output of `JSON.stringify()` without
 * indents).
 *
 * @param {DirectoryJSON | Uint8Array} value
 * @returns {value is JsonUint8Array<SnapshotNode>}
 * @see {@link https://jsonjoy.com/specs/compact-json}
 */
const isCompactJson = (value) => {
  return ArrayBuffer.isView(value) && value.subarray(0, 1).toString() === '['
}

/**
 * Creates a `Volume` from a "Compact JSON" snapshot.
 *
 * @param {JsonUint8Array<SnapshotNode>} snapshotJson - "Compact JSON" snapshot
 * @returns {Promise<Volume>} New `Volume`
 */
async function createVolFromSnapshot(snapshotJson) {
  const { vol } = memfs()
  await fromJsonSnapshot(snapshotJson, { fs: vol.promises, path: '/' })
  return vol
}

const MIN_DELAY = 10
const MAX_DELAY = 200

/**
 * Loads a fixture JSON file or `DirectoryJSON` object or a "Compact JSON" value
 * and resolves w/ a `Volume` and read powers.
 *
 * If a "Compact JSON" value, it must be a `Uint8Array`.
 *
 * Caches anything it loads from disk.
 *
 * @remarks
 * `memfs` provides two (or three) different snapshot formats; the first is a
 * plain JSON object which can be loaded into a `Volume` via
 * {@link Volume.fromJSON}. The newer "snapshot" format is a binary JSON type
 * which looks to be more performant which has better handling of binary data
 * (e.g., _native modules_) and supports symlinks. That's why we load the
 * fixture into a `Buffer` instead of a `string`; once we've determined the
 * value is _not_ a "Compact JSON" snapshot, we can parse it as a
 * `DirectoryJSON` object using {@link JSON.parse}.
 * @param {string | URL | DirectoryJSON | JsonUint8Array<SnapshotNode>} pathOrJson
 *   Path to fixture JSON or directory object
 * @param {Object} [options] Options
 * @param {boolean} [options.randomDelay=false] If `true`, adds a random delay
 *   before reading the fixture. This is useful for testing purposes. Default is
 *   `false`
 * @returns {Promise<{
 *   vol: Volume
 *   readPowers: ReadNowPowers
 * }>}
 * @see {@link https://github.com/streamich/memfs/blob/master/docs/snapshot/index.md}
 * @todo Standardize entry point filename and return the entry point path.
 */
export async function loadJSONFixture(
  pathOrJson,
  { randomDelay = false } = {}
) {
  /** @type {Volume} */
  let vol
  await Promise.resolve()
  if (isString(pathOrJson) || pathOrJson instanceof URL) {
    if (loadJSONFixture.dirJsonCache.has(pathOrJson)) {
      vol = Volume.fromJSON(
        /** @type {DirectoryJSON} */ (
          loadJSONFixture.dirJsonCache.get(pathOrJson)
        )
      )
    } else if (loadJSONFixture.snapshotCache.has(pathOrJson)) {
      vol = await createVolFromSnapshot(
        /** @type {JsonUint8Array<SnapshotNode>} */ (
          loadJSONFixture.snapshotCache.get(pathOrJson)
        )
      )
    } else {
      const filepath = pathOrJson
      const rawJson = await fs.promises.readFile(filepath)
      if (isCompactJson(rawJson)) {
        loadJSONFixture.snapshotCache.set(pathOrJson, rawJson)
        vol = await createVolFromSnapshot(rawJson)
      } else {
        const dirJson = JSON.parse(rawJson.toString('utf-8'))
        loadJSONFixture.dirJsonCache.set(pathOrJson, dirJson)
        vol = Volume.fromJSON(dirJson)
      }
    }
  } else {
    const json = pathOrJson
    vol = isCompactJson(json)
      ? await createVolFromSnapshot(json)
      : Volume.fromJSON(json)
  }

  const readPowers = makeReadPowers({ fs: /** @type {FsInterface} */ (vol) })
  if (randomDelay) {
    const { maybeRead } = readPowers
    readPowers.maybeRead = async (specifier) => {
      await scheduler.wait(
        Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY
      )
      // @ts-expect-error needs type fix
      return maybeRead(specifier)
    }
  }
  return { vol, readPowers }
}

/**
 * Cache of filepath/URL to {@link DirectoryJSON} object.
 *
 * @type {Map<string | URL, DirectoryJSON>}
 */
loadJSONFixture.dirJsonCache = new Map()
/**
 * Cache of filepath/URL to {@link JsonUint8Array} (for snapshots).
 *
 * @type {Map<string | URL, JsonUint8Array<SnapshotNode>>}
 */
loadJSONFixture.snapshotCache = new Map()

/**
 * URL path to JSON fixtures.
 *
 * @remarks
 * The trailing slash is load-bearing.
 */
export const JSON_FIXTURE_DIR_URL = new URL('./json-fixture/', import.meta.url)

/**
 * The default entry point for all JSON fixtures
 */
export const DEFAULT_JSON_FIXTURE_ENTRY_POINT = '/index.js'
