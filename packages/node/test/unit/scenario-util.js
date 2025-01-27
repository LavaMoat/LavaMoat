import { mergePolicy } from 'lavamoat-core'
import util from 'node:util'
// @ts-expect-error - needs types
import { prepareScenarioOnDisk } from 'lavamoat-core/test/util.js'
import { memfs } from 'memfs'
import { once } from 'node:events'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import {
  DEFAULT_POLICY_FILENAME,
  DEFAULT_POLICY_OVERRIDE_FILENAME,
} from '../../src/constants.js'
import { log as fallbackLog } from '../../src/log.js'

/**
 * @import {Volume} from 'memfs/lib/volume.js'
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 * @import {LavaMoatEndoPolicy} from '../../src/types.js'
 * @import {ReadFn} from '@endo/compartment-mapper'
 * @import {PlatformRunScenario} from 'lavamoat-core/test/util.js'
 */

/**
 * Path to `./runner.js`
 */
const RUNNER_MODULE_PATH = (
  process.env.WALLABY_PROJECT_DIR
    ? pathToFileURL(
        path.join(
          process.env.WALLABY_PROJECT_DIR,
          'packages',
          'node',
          'test',
          'scenario-runner.js'
        )
      )
    : new URL('./scenario-runner.js', import.meta.url)
).pathname

/**
 * Dumps a bunch of information about an error and the virtual FS volume.
 * Optionally, policies
 *
 * @param {unknown} err
 * @param {Volume} vol
 * @param {object} options
 * @param {LavaMoatPolicy} [options.lavamoatPolicy]
 * @param {LavaMoatEndoPolicy} [options.endoPolicy]
 * @param {(...args: any) => void} [options.log]
 */
function dumpError(
  err,
  vol,
  { lavamoatPolicy, endoPolicy, log = fallbackLog.error.bind(fallbackLog) } = {}
) {
  log()
  log(util.inspect(err, { depth: null }))
  if (endoPolicy) {
    log('Endo policy:')
    log(util.inspect(endoPolicy, { depth: null }))
  }
  if (lavamoatPolicy) {
    log('Lavamoat policy:')
    log(util.inspect(lavamoatPolicy, { depth: null }))
  }
  log('Filesystem:')
  log(vol.toTree())
  log()
}

/**
 * Reads a policy and policy overrides using a `ReadFn`, then merges the result.
 *
 * @param {ReadFn} readPower - File read power
 * @param {string} policyDir - Path to the policy directory. If relative, will
 *   be resolved to cwd
 * @returns {Promise<LavaMoatPolicy>}
 * @todo Make the stuff in `lavamoat-core`'s `loadPolicy` accept a `readPower`,
 *   and get rid of this.
 */
async function readPolicy(readPower, policyDir) {
  let [lavamoatPolicy, lavamoatPolicyOverrides] = await Promise.all(
    [DEFAULT_POLICY_FILENAME, DEFAULT_POLICY_OVERRIDE_FILENAME].map(
      (filename) =>
        readPower(path.resolve(policyDir, filename))
          .then((bytes) => JSON.parse(`${bytes}`))
          .catch((err) => {
            if (err.code !== 'ENOENT') {
              throw err
            }
            return undefined
          })
    )
  )
  if (!lavamoatPolicy) {
    throw new Error(`LavaMoat - policy not found in ${policyDir}`)
  }

  if (lavamoatPolicyOverrides) {
    lavamoatPolicy = mergePolicy(lavamoatPolicy, lavamoatPolicyOverrides)
  }

  return lavamoatPolicy
}

/**
 * @param {NodeJS.ReadableStream} stdout
 * @param {NodeJS.ReadableStream} stderr
 * @returns {Promise<[stdout: string, stderr: string]>}
 */
async function trapOutput(stdout, stderr) {
  /** @type {Buffer[]} */
  const stdoutChunks = []
  /** @type {Buffer[]} */
  const stderrChunks = []

  return Promise.all([
    new Promise((resolve, reject) => {
      stdout
        .on('data', (chunk) => {
          stdoutChunks.push(Buffer.from(chunk))
        })
        .on('end', () => {
          resolve(Buffer.concat(stdoutChunks).toString('utf8'))
        })
        .on('error', reject)
    }),
    new Promise((resolve, reject) => {
      stderr
        .on('data', (chunk) => {
          stderrChunks.push(Buffer.from(chunk))
        })
        .on('end', () => {
          resolve(Buffer.concat(stderrChunks).toString('utf8'))
        })
        .on('error', reject)
    }),
  ])
}

/**
 * Bootstraps the scenario runner.
 *
 * Return value should be provided to `lavamoat-core`'s `runAndTestScenario`
 *
 * @template [Result=unknown] Default is `unknown`
 * @param {(...args: any) => void} log Logger
 * @returns {PlatformRunScenario<Result>}
 */
export function createScenarioRunner(log = fallbackLog.error.bind(console)) {
  /**
   * Runs a scenario from `lavamoat-core`.
   *
   * The idea here is to establish feature-compatibility with `lavamoat-node`.
   *
   * @remarks
   * The runner in e.g., `lavamoat-node` spawns a child process for each
   * scenario; I don't feel that is necessary for our purposes. It _is_ useful
   * and necessary to test the CLI, but I'm not convinced there's added value in
   * doing so for _every scenario_.
   * @param {{ scenario: any }} opts
   * @returns {Promise<Result>} Result of the stdout of the scenario parsed as
   *   JSON
   * @todo Scenario needs a type definition
   */
  return async ({ scenario }) => {
    const { fs, vol } = memfs()

    const readFile = /** @type {ReadFn} */ (fs.promises.readFile)

    /** @type {string} */
    let projectDir
    /** @type {string} */
    let policyDir

    // for eslint
    await Promise.resolve()

    try {
      ;({ projectDir, policyDir } = await prepareScenarioOnDisk({
        fs: fs.promises,
        scenario,
        policyName: 'lavamoat-node',
      }))
    } catch (e) {
      dumpError(e, vol, { log })
      throw e
    }

    /** @type {LavaMoatPolicy} */
    let lavamoatPolicy
    try {
      lavamoatPolicy = await readPolicy(readFile, policyDir)
    } catch (err) {
      dumpError(err, vol, { log })
      throw err
    }

    /** @type {string} */
    let stdout
    /** @type {string} */
    let stderr
    /** @type {ReturnType<typeof trapOutput> | undefined} */
    let outputPromise

    try {
      const entryPath = path.join(projectDir, scenario.entries[0])
      const worker = new Worker(RUNNER_MODULE_PATH, {
        stdout: true,
        stderr: true,
        workerData: { entryPath, policy: lavamoatPolicy, vol: vol.toJSON() },
      })
      outputPromise = trapOutput(worker.stdout, worker.stderr)
      const [code] = await once(worker, 'exit')
      if (code !== 0) {
        try {
          ;[stdout, stderr] = await outputPromise
        } catch {
          stdout = ''
          stderr = ''
        }
        let msg = `Worker exited with code ${code} trying to run scenario ${scenario.name ?? '(unknown)'}`
        if (stderr) {
          msg += '\nSTDERR:\n' + stderr
        }
        if (stdout) {
          msg += '\n\nSTDOUT:\n' + stdout
        }
        throw new Error(msg)
      }
      ;[stdout, stderr] = await outputPromise
    } catch (err) {
      if (!scenario.expectedFailure) {
        dumpError(err, vol, { lavamoatPolicy, log })
      }
      throw err
    } finally {
      // TODO use AbortController
      outputPromise?.catch(() => {})
    }

    // nothing should output to stderr. except a debugger
    if (stderr && stderr.trim() !== 'Debugger attached.') {
      throw new Error(`Unexpected output in standard err: \n${stderr}`)
    }
    try {
      return JSON.parse(stdout)
    } catch (err) {
      throw new Error(`Unexpected output in standard out: \n${stdout}`)
    }
  }
}
