const test = require('ava')
const util = require('node:util')
const { join } = require('node:path')
const execFile = util.promisify(require('node:child_process').execFile)

const { runLava } = require('../src/index')

test('use lavamoat cli', async (t) => {
  const projectRoot = `${__dirname}/projects/2`
  const entryPath = './index.js'
  const lavamoatPath = join(__dirname, `/../src/cli.js`)
  const output = await execFile(lavamoatPath, [entryPath], { cwd: projectRoot })
  t.deepEqual(
    output.stdout.split('\n'),
    [
      'keccak256: 5cad7cf49f610ec53189e06d3c8668789441235613408f8fabcb4ad8dad94db5',
      '',
    ],
    'should return expected output'
  )
})

test('use lavamoat programmatically', async (t) => {
  const projectRoot = join(__dirname, `/projects/2`)
  const entryPath = './index.js'

  const result = await runLava({
    entryPath,
    projectRoot,
    debugMode: true,
  })

  t.is(
    result.keccak256,
    '5cad7cf49f610ec53189e06d3c8668789441235613408f8fabcb4ad8dad94db5',
    'should return expected result'
  )
})

test('use lavamoat-run-command', async (t) => {
  const projectRoot = join(__dirname, `/projects/2`)
  const lavamoatPath = join(__dirname, `/../src/run-command.js`)
  const output = await execFile(
    lavamoatPath,
    [
      '--autorun',
      '--policyPath',
      './atob.policy.json',
      '--',
      'atob',
      'MTIzNDU2Cg==',
    ],
    { cwd: projectRoot }
  )
  t.is(output.stdout.split('\n')[0], '123456', 'should return expected output')
})

test('use lavamoat cli and pass arguments down - backward compatibility', async (t) => {
  const projectRoot = join(__dirname, `/projects/5`)
  const entryPath = './index.js'
  const lavamoatPath = join(__dirname, `/../src/cli.js`)
  const output = await execFile(
    lavamoatPath,
    [
      entryPath,
      '--policyPath',
      './lavamoat/node/policy.json',
      '--data',
      'MTIzNDU2Cg==',
    ],
    { cwd: projectRoot }
  )

  // unless -- argument splitter is provided, we keep the old behavior of
  // passing all args to the entry point and dropping the argv[0] so that
  // lavamoat cli becomes the node path. The understanding of why it was so
  // is lost to time. New behavior is not reproducing this.
  //                         👇
  const expectations = `${lavamoatPath},${entryPath},--policyPath,./lavamoat/node/policy.json,--data,MTIzNDU2Cg==`
  t.is(
    output.stdout.split('\n')[0],
    expectations,
    'should return expected output'
  )
})

test('use lavamoat cli and pass arguments down - intentionally', async (t) => {
  const projectRoot = join(__dirname, `/projects/5`)
  const entryPath = './index.js'
  const lavamoatPath = join(__dirname, `/../src/cli.js`)
  const output = await execFile(
    lavamoatPath,
    [
      entryPath,
      '--policyPath',
      './lavamoat/node/policy.json',
      '--',
      '--data',
      'MTIzNDU2Cg==',
    ],
    { cwd: projectRoot }
  )
  const expectations = `${process.argv[0]},${entryPath},--data,MTIzNDU2Cg==`
  t.is(
    output.stdout.split('\n')[0],
    expectations,
    'should return expected output'
  )
})
