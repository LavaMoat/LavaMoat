const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const { prepareScenarioOnDisk } = require('lavamoat-core/test/util.js')
module.exports = {
  runLavamoat,
  runScenario
}

function convertOptsToArgs ({ scenario }) {
  const { entries, opts } = scenario
  if (entries.length !== 1) throw new Error('LavaMoat - invalid entries')
  const firstEntry = entries[0]
  const args = [firstEntry]
  if (opts.config) args.push(`--config=${opts.config}`)
  if (opts.configOverride) args.push(`--configOverride=${opts.configOverride}`)
  if (opts.configDebug) args.push(`--configDebug=${opts.configDebug}`)
  if (opts.debugMode) args.push('--debugMode')
  if (opts.applyExportsDefense) args.push('--applyExportsDefense')
  if (opts.writeAutoConfig) args.push('--writeAutoConfig')
  if (opts.writeAutoConfigAndRun) args.push('--writeAutoConfigAndRun')
  if (opts.writeAutoConfigDebug) args.push('--writeAutoConfigDebug')
  return args
}

async function runLavamoat ({ args = [], cwd = process.cwd() } = {}) {
  const lavamoatPath = `${__dirname}/../src/index.js`
  const output = await execFile(lavamoatPath, args, { cwd })
  return { output }
}

async function runScenario ({ scenario }) {
  const { projectDir } = await prepareScenarioOnDisk({ scenario, policyName: 'node' })
  const args = convertOptsToArgs({ scenario })
  const { output: { stdout, stderr } } = await runLavamoat({ args, cwd: projectDir })
  if (stderr.length) {
    throw new Error(`Run lavamoat failed:\n ${projectDir}\n ${args}\n ${stderr}`)
  }
  const result = JSON.parse(stdout)
  return result
}
