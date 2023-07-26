const test = require('ava')
const { parseForPolicy } = require('../src/parseForPolicy')
const { runLavamoat } = require('./util')
require('./arguments')
require('./envConfig')
require('./globals')
require('./runScenarios')

test('parseForPolicy - resolutions', async (t) => {
  const projectRoot = `${__dirname}/projects/1`
  const entryId = `${projectRoot}/index.js`
  const resolutions = {
    a: {
      fs: `${projectRoot}/fake-fs.js`,
      b: `${projectRoot}/fake-b.js`,
    },
  }

  const policy1 = await parseForPolicy({ entryId, projectRoot })
  t.deepEqual(policy1, {
    resources: {
      a: {
        builtin: {
          'fs.deleteEntireHardDrive': true,
        },
        packages: {
          b: true,
        },
      },
      b: {
        'builtin': {
          'http': true,
        },
      },
    },
  })

  const policy2 = await parseForPolicy({ entryId, projectRoot, policyOverride: { resolutions } })
  t.deepEqual(policy2, {
    resolutions,
    resources: {
      a: {
        packages: {
          '$root$': true,
        },
      },
    },
  }, 'policy resources do not include data on packages not parsed due to resolutions')
})

test('parseForPolicy - require a userspace package with a builtin name', async (t) => {
  const projectRoot = `${__dirname}/projects/4`
  const entryId = `${projectRoot}/index.js`

  const policy = await parseForPolicy({ entryId, projectRoot })
  t.deepEqual(policy, {
    resources: {
      a: {
        packages: {
          events: true,
        },
      },
      b: {
        builtin: {
          'events.EventEmitter': true,
        },
      },
      events: {
        globals: {
          console: true,
        },
      },
    },
  })
})

test('parseForPolicy - indirectly used packages are included in parent\'s allowlist', async (t) => {
  const projectRoot = `${__dirname}/projects/5`
  const entryId = `${projectRoot}/index.js`
  const policy = await parseForPolicy({ entryId, projectRoot })
  t.deepEqual(policy, {
    resources: { a: { builtin: { crypto: true } } },
  })
})

// run lavamoat-node
test('execute - resolutions', async (t) => {
  const projectRoot = `${__dirname}/projects/1`
  const entryId = './index.js'
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(output.stdout.split('\n'), [
    'fake-fs called',
    'value: 42',
    '',
  ], 'should not have any standard output')
})

test('execute - keccak with native modules', async (t) => {
  const projectRoot = `${__dirname}/projects/2`
  const entryId = './index.js'
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(output.stdout.split('\n'), [
    'keccak256: 5cad7cf49f610ec53189e06d3c8668789441235613408f8fabcb4ad8dad94db5',
    '',
  ], 'should not have any standard output')
})

test('execute - core modules and buffers', async (t) => {
  const projectRoot = `${__dirname}/projects/3`
  const entryId = './index.js'
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(output.stdout.split('\n'), [
    'sha256: fb1520a08f1bc43831d0000dc76f6b0f027bafd36c55b1f43fc54c60c2f831da',
    '',
  ], 'should not have any standard output')
})
