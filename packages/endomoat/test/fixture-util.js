import { memfs, Volume } from 'memfs'
import { fromJsonSnapshot } from 'memfs/lib/snapshot/index.js'
import fs from 'node:fs'
import { makeReadPowers } from '../src/power.js'

const { isArray } = Array

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
 *   vol: import('memfs').Volume
 *   readPowers: import('@endo/compartment-mapper').ReadPowers
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
 * Creats a `Volume` from a "Compact JSON" snapshot.
 *
 * Note: We don't have an actual type for "Compact JSON", _but_ I can tell you
 * that it's an array and it's valid JSON.
 *
 * @param {import('type-fest').JsonArray} snapshotJson - "Compact JSON" snapshot
 * @returns {Promise<import('memfs').Volume>} New `Volume`
 */
async function createVolFromSnapshot(snapshotJson) {
  const { vol } = memfs()

  const uint8 = /**
   * @type {import('memfs/lib/snapshot/json.js').JsonUint8Array<
   *   import('memfs/lib/snapshot/types.js').SnapshotNode
   * >}
   */ (new TextEncoder().encode(JSON.stringify(snapshotJson)))
  await fromJsonSnapshot(uint8, { fs: vol.promises, path: '/' })
  return vol
}

/**
 * Loads a fixture JSON file or `DirectoryJSON` object (_not_ a "Compact JSON"
 * object) and resolves w/ a `Volume` and `ReadFn`.
 *
 * The fixture JSON should be a `DirectoryJSON` object or a "Compact JSON"
 * object.
 *
 * Caches any JSON loaded from disk.
 *
 * @param {string | URL | import('memfs').DirectoryJSON} pathOrJson - Path to
 *   fixture JSON or directory object
 * @returns {Promise<{
 *   vol: import('memfs').Volume
 *   readPowers: import('@endo/compartment-mapper').ReadPowers
 * }>}
 * @see {@link https://jsonjoy.com/specs/compact-json}
 * @todo Standardize entry point filename and return the entry point path.
 */
export async function loadJSONFixture(pathOrJson) {
  /** @type {import('memfs').Volume} */
  let vol
  await Promise.resolve()
  if (typeof pathOrJson === 'string' || pathOrJson instanceof URL) {
    if (loadJSONFixture.cache.has(pathOrJson)) {
      const json = loadJSONFixture.cache.get(pathOrJson)
      // TODO: type guard maybe
      vol = isArray(json)
        ? await createVolFromSnapshot(json)
        : Volume.fromJSON(/** @type {import('memfs').DirectoryJSON} */ (json))
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
      : Volume.fromJSON(json)
  }

  const readPowers = makeReadPowers(
    /** @type {import('@endo/compartment-mapper').FsAPI} */ (vol)
  )
  return { vol, readPowers }
}
/**
 * Parsed JSON cache. Can be a `DirectoryJSON` or CJSON snapshot
 *
 * @type {Map<string | URL, object>}
 */
loadJSONFixture.cache = new Map()
