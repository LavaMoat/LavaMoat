const { loadCanonicalNameMap } = require('./index.js');

const { writeHeapSnapshot } = require('v8');

main()

async function main() {
  console.time('loadCanonicalNameMap')
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: process.cwd(), includeDevDeps: true })
  console.timeEnd('loadCanonicalNameMap')
  console.log('# of results:', canonicalNameMap.size)
  console.log('heap used', process.memoryUsage().heapUsed / 1000000, 'MB')
  console.log('snapshot written', writeHeapSnapshot())
}