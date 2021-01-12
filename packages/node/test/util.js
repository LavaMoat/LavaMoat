const util = require('util')
const path = require('path')
const execFile = util.promisify(require('child_process').execFile)
const { promises: fs } = require('fs')
var tmp = require('tmp-promise')
const stringify = require('json-stable-stringify')
module.exports = {
  runLavamoat,
  runScenario,
  prepareScenario
}

async function runLavamoat ({ args = [], cwd = process.cwd() } = {}) {
  const lavamoatPath = `${__dirname}/../src/index.js`
  const output = await execFile(lavamoatPath, args, { cwd })
  return { output }
}

async function runScenario ({ scenario, opts }) {
  const { projectDir } = await prepareScenario({ scenario })
  const args = convertOptsToArgs({ scenario, opts })
  const { output: { stdout, stderr } } = await runLavamoat({ args, cwd: projectDir })
  if (stderr.length) {
    throw new Error(stderr)
  }
  const result = JSON.parse(stdout)
  return result
}

async function prepareScenario ({ scenario }) {
  const { path: projectDir } = await tmp.dir()
  const filesToWrite = Object.values(scenario.files)
  filesToWrite.push({ file: 'lavamoat-config.json', content: stringify(scenario.config) })
  await Promise.all(filesToWrite.map(async (file) => {
    const fullPath = path.join(projectDir, file.file)
    const dirname = path.dirname(fullPath)
    await fs.mkdir(dirname, { recursive: true })
    await fs.writeFile(fullPath, file.content)
  }))
  return { projectDir }
}

function convertOptsToArgs ({ scenario, opts }) {
  const { entries } = scenario
  if (entries.length !== 1) throw new Error('LavaMoat - invalid entries')
  const firstEntry = entries[0]
  return [firstEntry]
}
