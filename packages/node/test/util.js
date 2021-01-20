const util = require('util')
const execFile = util.promisify(require('child_process').execFile)
const { prepareScenarioOnDisk, convertOptsToArgs } = require('lavamoat-core/test/util.js')
module.exports = {
  runLavamoat,
  runScenario
}

async function runLavamoat ({ args = [], cwd = process.cwd() } = {}) {
  const lavamoatPath = `${__dirname}/../src/index.js`
  const output = await execFile(lavamoatPath, args, { cwd })
  return { output }
}

async function runScenario ({ scenario }) {
  const { projectDir } = await prepareScenarioOnDisk({ scenario })
  const args = convertOptsToArgs({ scenario })
  const { output: { stdout, stderr } } = await runLavamoat({ args, cwd: projectDir })
  if (stderr.length) {
    throw new Error(stderr)
  }
  const result = JSON.parse(stdout)
  return result
}
