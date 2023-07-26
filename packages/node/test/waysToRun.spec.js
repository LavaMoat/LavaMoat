
const test = require('ava')
const util = require('util')
const execFile = util.promisify(require('child_process').execFile)

const { runLava } = require('../src/index')

test('use lavamoat cli', async (t) => {
  const projectRoot = `${__dirname}/projects/2`
  const entryPath = './index.js'
  const lavamoatPath = `${__dirname}/../src/cli.js`
  const output = await execFile(lavamoatPath, [entryPath], { cwd: projectRoot })
  t.deepEqual(output.stdout.split('\n'), [
    'keccak256: 5cad7cf49f610ec53189e06d3c8668789441235613408f8fabcb4ad8dad94db5',
    '',
  ], 'should return expected output')
})

test('use lavamoat programmatically', async (t) => {
  const projectRoot = `${__dirname}/projects/2`
  const entryPath = './index.js'

  await runLava({
    entryPath,
    projectRoot,
    debugMode: true,
  })

  // TODO: add means to endow entry with new references and pass a callback to assert it's been called.

  t.pass()  
})

test('use lavamoat-run-command', async (t) => {
  const projectRoot = `${__dirname}/projects/2`
  const lavamoatPath = `${__dirname}/../src/run-command.js`
  const output = await execFile(lavamoatPath, ['--autorun', '--policyPath', './atob.policy.json', '--', 'atob', 'MTIzNDU2Cg=='], { cwd: projectRoot })
  t.is(output.stdout.split('\n')[0], '123456', 'should return expected output')
})
