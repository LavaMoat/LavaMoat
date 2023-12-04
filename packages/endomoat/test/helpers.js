import capcon from 'capture-console'
import { mergePolicy } from 'lavamoat-core'
import { prepareScenarioOnDisk } from 'lavamoat-core/test/util.js'
import { Volume, createFsFromVolume } from 'memfs'
import path from 'node:path'
import { run, toEndoPolicy } from '../src/index.js'

/**
 *
 * @param {unknown} err
 * @param {import('memfs').Volume} vol
 * @param {import('lavamoat-core').LavaMoatPolicy} [lavamoatPolicy]
 * @param {import('../src/policy-converter.js').LavaMoatEndoPolicy} [endoPolicy]
 */
function dumpError(err, vol, lavamoatPolicy, endoPolicy) {
  console.debug()
  console.debug(err)
  if (endoPolicy) {
    console.debug('Endo policy:')
    console.dir(endoPolicy, { depth: null })
  }
  if (lavamoatPolicy) {
    console.debug('Lavamoat policy:')
    console.dir(lavamoatPolicy, { depth: null })
  }
  console.debug('FS:')
  console.debug(vol.toTree())
  console.debug()
}

/**
 * Reads a policy and policy overrides using a `ReadFn`, then merges the result.
 *
 * @param {import('@endo/compartment-mapper').ReadFn} readPower
 * @param {string} policyDir
 * @returns {Promise<import('lavamoat-core').LavaMoatPolicy>}
 */
async function readPolicy(readPower, policyDir) {
  // console.debug('Reading policy from %s', policyDir)
  let [lavamoatPolicy, lavamoatPolicyOverrides] = await Promise.all(
    ['policy.json', 'policy-override.json'].map((filename) =>
      readPower(path.join(policyDir, filename))
        .then((bytes) => `${bytes}`)
        .then(JSON.parse)
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
    // console.debug('Applying policy overrides; before:')
    // console.dir(lavamoatPolicy, { depth: null })
    lavamoatPolicy = mergePolicy(lavamoatPolicy, lavamoatPolicyOverrides)
    // console.debug('after:')
    // console.dir(lavamoatPolicy, { depth: null })
  }

  return lavamoatPolicy
}

function capture() {
  let stdout = ''
  let stderr = ''
  capcon.startCapture(process.stderr, { quiet: true }, (data) => {
    stderr += data
  })
  capcon.startCapture(process.stdout, { quiet: true }, (data) => {
    stdout += data
  })

  return () => {
    try {
      capcon.stopCapture(process.stdout)
      capcon.stopCapture(process.stderr)
    } catch {}
    return { stdout, stderr }
  }
}

export async function runScenario({ scenario }) {
  const vol = new Volume()
  const fs = createFsFromVolume(vol)

  const readFile = /** @type {import('@endo/compartment-mapper').ReadFn} */ (
    fs.promises.readFile
  )

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
      policyName: 'endomoat',
    }))
  } catch (e) {
    dumpError(e, vol)
    throw e
  }

  /** @type {import('lavamoat-core').LavaMoatPolicy} */
  let lavamoatPolicy
  try {
    lavamoatPolicy = await readPolicy(readFile, policyDir)
  } catch (e) {
    dumpError(e, vol)
    throw e
  }

  const endoPolicy = toEndoPolicy(lavamoatPolicy)

  const entryPath = new URL(
    `file://` + path.join(projectDir, scenario.entries[0])
  )

  /** @type {import('@endo/compartment-mapper').ReadFn} */
  const readPower = async (location) => readFile(new URL(location).pathname)

  const stopCapture = capture()

  /** @type {string} */
  let stderr
  /** @type {string} */
  let stdout
  try {
    await run(entryPath, { readPower, endoPolicy })
    ;({ stderr, stdout } = stopCapture())
  } catch (err) {
    // this must happen prior to dumping the error
    ;({ stderr, stdout } = stopCapture())

    if (!scenario.expectedFailure) {
      dumpError(err, vol, lavamoatPolicy, endoPolicy)
    }
    throw err
  }

  let result
  if (stderr) {
    throw new Error(`Unexpected output in standard err: \n${stderr}`)
  }
  try {
    result = JSON.parse(stdout)
  } catch (e) {
    throw new Error(`Unexpected output in standard out: \n${stdout}`)
  }
  return result
}
