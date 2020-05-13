const test = require('tape')
const { runNode } = require('./util')

test('execute - keccak with native modules', async (t) => {
  const projectRoot = `${__dirname}/projects/1`
  const entryPath = './index.js'
  const { output } = await runNode({
    cwd: projectRoot,
    entryPath
  })
  t.equal(output.stderr, '', 'should not have any error output')
  t.deepEqual(output.stdout.split('\n'), [
    'keccak256: 5cad7cf49f610ec53189e06d3c8668789441235613408f8fabcb4ad8dad94db5',
    ''
  ], 'should not have any standard output')
  t.end()
})
