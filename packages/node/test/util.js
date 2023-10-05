// @ts-check

const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const { prepareScenarioOnDisk } = require('lavamoat-core/test/util.js')
module.exports = {
  runLavamoat,
  runScenario,
}

/**
 * Add one or more CLI options to an array of args
 *
 * Mutates `args`
 * @param {string[]} args - Array of args
 * @param {string} key - Option name
 * @param {any} value - Value; if array, `key` will be set multiple times
 * @returns {void}
 */
function setOptToArgs(args, key, value) {
  if (Array.isArray(value)) {
    value.forEach((v) => setOptToArgs(args, key, v))
    return
  }
  if (typeof value === 'object') {
    args.push(`--${key}='${JSON.stringify(value)}'`)
    return
  }
  if (value === true) {
    args.push(`--${key}`)
  } else if (typeof value === 'string') {
    args.push(`--${key}='${value}'`)
  } else {
    args.push(`--${key}=${value}`)
  }
}

/**
 * Converts options within a `NormalizedScenario` to CLI args.
 * @param {import('lavamoat-core/test/scenarios/scenario').NormalizedScenario} scenario
 * @returns {string[]}
 */
function convertOptsToArgs(scenario) {
  const { entries, opts } = scenario
  if (entries.length !== 1) {
    throw new Error('LavaMoat - invalid entries')
  }
  const firstEntry = entries[0]
  const args = [firstEntry]
  Object.entries(opts).forEach(([key, value]) => setOptToArgs(args, key, value))
  return args
}

/**
 * Runs Lavamoat CLI
 * @param {{args?: string[], cwd?: string}} opts
 * @returns {Promise<{output: {stdout: string, stderr: string}}>}
 */
async function runLavamoat({ args = [], cwd = process.cwd() } = {}) {
  const lavamoatPath = require.resolve('../src/cli')
  const output = await execFile(lavamoatPath, args, { cwd })
  return { output }
}

/**
 * Run the given scenario.
 *
 * The `scenario` itself should be passed thru `createScenarioFromScaffold` to normalize it.
 *
 * @template [T=unknown]
 * @param {{scenario: import('lavamoat-core/test/scenarios/scenario').NormalizedScenario}} opts
 * @returns {Promise<T>}
 */
async function runScenario({ scenario }) {
  const { projectDir } = await prepareScenarioOnDisk({
    scenario,
    policyName: 'node',
  })
  const args = convertOptsToArgs(scenario)
  const {
    output: { stdout, stderr },
  } = await runLavamoat({ args, cwd: projectDir })
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
