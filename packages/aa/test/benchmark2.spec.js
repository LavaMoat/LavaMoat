const test = require('ava')
const path = require('node:path')
const { benchAsync } = require('./utils')
const { loadCanonicalNameMap } = require('../src/index.js')

test('[bench] loadCanonicalNameMap on workspace root', async (t) => {
  const subject = loadCanonicalNameMap.bind(null, {
    rootDir: path.join(__dirname, '..', '..', '..'),
    includeDevDeps: true,
  })
  const map = await subject()
  t.assert(
    map.size > 100,
    'Expected map to have many entries. Check the rootDir path. It should point to the workspace root of the repo for this benchmark to be effective.'
  )

  const result = await benchAsync(subject, 'loadCanonicalNameMap', 10)
  t.log({ result })
  t.assert(
    result['loadCanonicalNameMap'] < 500, // arbitrary large number so we notice when we degrade by orders of magnitude. Watch the results when developing.
    'expected loadCanonicalNameMap to be faster than 500ms'
  )
})
