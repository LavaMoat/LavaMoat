const path = require('node:path')
const { readFileSync } = require('node:fs')
const test = require('ava')
const { parseForPolicy } = require('../src/parseForPolicy')
const { runLavamoat } = require('./util')

test('parseForPolicy - resolutions', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '1')
  const entryId = path.join(projectRoot, 'index.js')
  const resolutions = {
    a: {
      fs: path.join(projectRoot, 'fake-fs.js'),
      b: path.join(projectRoot, 'fake-b.js'),
    },
  }

  const policy1 = await parseForPolicy({ entryId, projectRoot })

  // snapshot to prevent regression in policy sorting or output
  t.snapshot(
    readFileSync(path.join(projectRoot, 'lavamoat/node/policy.json'), 'utf8')
  )

  t.deepEqual(policy1, {
    resources: {
      'a>0zero': {
        builtin: {
          'fs.createReadStream': true,
        },
      },
      a: {
        builtin: {
          'fs.deleteEntireHardDrive': true,
        },
        packages: {
          b: true,
          'a>0zero': true,
        },
      },
      b: {
        builtin: {
          http: true,
        },
      },
    },
  })

  const policy2 = await parseForPolicy({
    entryId,
    projectRoot,
    policyOverride: { resolutions },
  })
  t.deepEqual(
    policy2.resources.a,
    {
      packages: {
        $root$: true,
        'a>0zero': true,
      },
    },
    'policy resources do not include data on packages not parsed due to resolutions'
  )
})

test('parseForPolicy - require a userspace package with a builtin name', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '4')
  const entryId = path.join(projectRoot, 'index.js')

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

test("parseForPolicy - indirectly used packages are included in parent's allowlist", async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '5')
  const entryId = path.join(projectRoot, 'index.js')
  const policy = await parseForPolicy({ entryId, projectRoot })
  t.deepEqual(policy, {
    resources: { a: { builtin: { crypto: true } } },
  })
})

test('parseForPolicy - find node:-prefixed builtins', async (t) => {
  const projectRoot = `${__dirname}/projects/6`
  const entryId = `${projectRoot}/index.js`
  const policy = await parseForPolicy({ entryId, projectRoot })
  t.deepEqual(policy, {
    resources: {
      a: {
        builtin: {
          'node:events.EventEmitter': true,
        },
      },
    },
  })
})

// run lavamoat-node
test('execute - resolutions', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '1')
  const entryId = path.join(projectRoot, 'index.js')
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(
    output.stdout.split('\n'),
    ['fake-fs called', 'value: 42', ''],
    'should not have any standard output'
  )
})

test('execute - keccak with native modules', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '2')
  const entryId = path.join(projectRoot, 'index.js')
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(
    output.stdout.split('\n'),
    [
      'keccak256: 5cad7cf49f610ec53189e06d3c8668789441235613408f8fabcb4ad8dad94db5',
      '',
    ],
    'should not have any standard output'
  )
})

test('execute - core modules and buffers', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '3')
  const entryId = path.join(projectRoot, 'index.js')
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(
    output.stdout.split('\n'),
    [
      'sha256: fb1520a08f1bc43831d0000dc76f6b0f027bafd36c55b1f43fc54c60c2f831da',
      '',
    ],
    'should not have any standard output'
  )
})

test('execute - static require downstream from dynamic require', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '7')
  const entryId = path.join(projectRoot, 'index.js')
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.is(output.stdout, '{"b":42,"c":42}\n')
})
