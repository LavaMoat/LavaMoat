import { memfs } from 'memfs'
import { fromJsonSnapshot } from 'memfs/lib/snapshot/index.js'
import { Volume } from 'memfs/lib/volume.js'
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { makeReadPowers } from '../src/power.js'

/**
 * @import {ReadNowPowers, FsInterface} from '@endo/compartment-mapper'
 * @import {DirectoryJSON} from 'memfs'
 * @import {ExecutionContext} from 'ava'
 * @import {SnapshotNode} from 'memfs/lib/snapshot/types.js'
 * @import {JsonUint8Array} from 'memfs/lib/snapshot/json.js'
 * @import {ExecFileException} from 'node:child_process'
 */

/**
 * Possible types for the `expected` argument of the {@link testCLI} macro.
 *
 * Execution output will be automatically trimmed and stripped of ANSI escape
 * codes (colors).
 *
 * If a `string`, it is compared to `stdout`.
 *
 * @template [Ctx=unknown] Default is `unknown`
 * @typedef {string
 *   | { code: ExitCode }
 *   | {
 *       stdout: string
 *       code?: ExitCode
 *     }
 *   | {
 *       stderr: string
 *       code?: ExitCode
 *     }
 *   | {
 *       stdout: string
 *       stderr: string
 *       code?: ExitCode
 *     }
 *   | ((
 *       t: ExecutionContext<Ctx>,
 *       result: {
 *         stdout: string
 *         stderr: string
 *         code?: ExitCode
 *       }
 *     ) => void | Promise<void>)} ExecLavamoatNodeExpectation
 */

/**
 * Possible exit code values, as defined by Node.js
 *
 * @typedef {ExecFileException['code']} ExitCode
 */

const execFileAsync = promisify(execFile)
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
 * Creats a `Volume` from a "Compact JSON" snapshot.
 *
 * Note: We don't have an actual type for "Compact JSON", _but_ I can tell you
 * that it's an array and it's valid JSON.
 *
 * @param {import('type-fest').JsonArray} snapshotJson - "Compact JSON" snapshot
 * @returns {Promise<Volume>} New `Volume`
 */
async function createVolFromSnapshot(snapshotJson) {
  const { vol } = memfs()

  const uint8 = /**
   * @type {JsonUint8Array<SnapshotNode>}
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
 * @param {string | URL | DirectoryJSON} pathOrJson - Path to fixture JSON or
 *   directory object
 * @returns {Promise<{
 *   vol: Volume
 *   readPowers: ReadNowPowers
 * }>}
 * @see {@link https://jsonjoy.com/specs/compact-json}
 * @todo Standardize entry point filename and return the entry point path.
 */
export async function loadJSONFixture(pathOrJson) {
  /** @type {Volume} */
  let vol
  await Promise.resolve()
  if (typeof pathOrJson === 'string' || pathOrJson instanceof URL) {
    if (loadJSONFixture.cache.has(pathOrJson)) {
      const json = loadJSONFixture.cache.get(pathOrJson)
      // TODO: type guard maybe
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
      : Volume.fromJSON(json)
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
 * @returns {Promise<{ stdout: string; stderr: string; code: ExitCode }>}
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
