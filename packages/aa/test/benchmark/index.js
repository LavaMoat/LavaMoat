const path = require('node:path')
const assert = require('node:assert')
const { benchAsync } = require('../bench')
const { loadCanonicalNameMap } = require('../../src/index')

async function run() {
  const subject = loadCanonicalNameMap.bind(null, {
    rootDir: path.join(__dirname, '..', '..', '..', '..'),
    includeDevDeps: true,
  })
  // prewarm and check if the setup is still correct
  const map = await subject()
  assert(
    map.size > 100,
    'Expected map to have many entries. Check the rootDir path. It should point to the workspace root of the repo for this benchmark to be effective.'
  )

  const result = await benchAsync(subject, `loadCanonicalNameMap`, 10)

  console.table(result)
}

run()
