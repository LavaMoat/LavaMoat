const path = require('node:path')
const test = require('ava')
const { parseForPolicy } = require('../src/parseForPolicy')
const { runLavamoat } = require('./util')

test.beforeEach(() => {
  process.env.LAVAMOAT_RESOLVE_NATIVE = '1'
})

test.afterEach.always(() => {
  process.env.LAVAMOAT_RESOLVE_NATIVE = undefined
})

test('parseForPolicy - path containing # character resolves', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '5')
  const entryId = path.join(projectRoot, 'index.js')
  const policy = await parseForPolicy({ entryId, projectRoot })
  t.deepEqual(policy, {
    resources: { a: { builtin: { crypto: true } } },
  })
})

test('execute - path containing # character resolves', async (t) => {
  const projectRoot = path.join(__dirname, 'projects', '5')
  const entryId = path.join(projectRoot, 'index.js')
  const { output } = await runLavamoat({
    cwd: projectRoot,
    args: [entryId],
  })
  t.deepEqual(output.stderr, '')
})
