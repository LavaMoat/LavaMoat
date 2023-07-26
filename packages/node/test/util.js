const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const { prepareScenarioOnDisk } = require('lavamoat-core/test/util.js')
module.exports = {
  runLavamoat,
  runScenario,
}

function setOptToArgs(args, key, value) {
  if (Array.isArray(value)) {
    value.forEach(v => setOptToArgs(args, key, v))
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

function convertOptsToArgs ({ scenario }) {
  const { entries, opts } = scenario
  if (entries.length !== 1) {
    throw new Error('LavaMoat - invalid entries')
  }
  const firstEntry = entries[0]
  const args = [firstEntry]
  Object
    .entries(opts)
    .forEach(([key, value]) => setOptToArgs(args, key, value))
  return args
}

async function runLavamoat ({ args = [], cwd = process.cwd() } = {}) {
  const lavamoatPath = `${__dirname}/../src/cli.js`
  const output = await execFile(lavamoatPath, args, { cwd })
  return { output }
}

async function runScenario ({ scenario }) {
  const { projectDir } = await prepareScenarioOnDisk({ scenario, policyName: 'node' })
  const args = convertOptsToArgs({ scenario })
  const { output: { stdout, stderr } } = await runLavamoat({ args, cwd: projectDir })
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
