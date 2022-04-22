const { loadCanonicalNameMap } = require('./index.js');

const { writeHeapSnapshot } = require('v8');

main()

async function main() {
  console.error('start')
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: process.cwd(), includeDevDeps: true })
  // writeHeapSnapshot()

  console.error('done')
  console.log(canonicalNameMap)

}