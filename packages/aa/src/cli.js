const { loadCanonicalNameMap, depPackageJsonPathCache, depsToWalkCache } = require('./index.js')
const fs = require('fs');
const v8 = require('v8');
// const resolveCache = require(process.cwd() + '/cache.json')
const resolveCache = {}
// const importMapCache = require(process.cwd() + '/cache-import.json')
const importMapCache = {}

async function createHeapSnapshot(label) {
  // It's important that the filename end with `.heapsnapshot`,
  // otherwise Chrome DevTools won't open it.
  const heapStream = v8.getHeapSnapshot()
  const fileName = `${label}-${Date.now()}.heapsnapshot`;
  const fileStream = fs.createWriteStream(fileName);
  let completionHandler
  heapStream.on('end', () => {
    console.warn('wrote', fileName)
    completionHandler();
  })
  heapStream.pipe(fileStream);
  return new Promise(resolve => { completionHandler = resolve });
}

console.warn('ready')
// setTimeout(main, 5000)
main()

async function main () {
  // await createHeapSnapshot('before')
  let resolveCacheWarmCount = 0
  Object.entries(resolveCache).forEach(([key, value]) => {
    depPackageJsonPathCache.set(key, value)
    resolveCacheWarmCount++
    // console.warn('resolve cache write', key)
  })
  console.warn('warmed resolve cache', resolveCacheWarmCount)
  let importMapCacheWarmCount = 0
  Object.entries(importMapCache).forEach(([key, value]) => {
    depsToWalkCache.set(key, value)
    importMapCacheWarmCount++
    // console.warn('resolve cache write', key)
  })
  console.warn('warmed import cache', importMapCacheWarmCount)
  
  console.warn('start')
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: process.cwd(), includeDevDeps: true })
  global.canonicalNameMap = canonicalNameMap
  // await createHeapSnapshot('after')
  console.warn('done')

  // console.log(JSON.stringify(Object.fromEntries([...depsToWalkCache.entries()])))

  // // wait forever, keep in memory
  // await new Promise(resolve => setTimeout(resolve, 1e12))
  // // console.warn(canonicalNameMap)
  // await loadCanonicalNameMap({ rootDir: process.cwd(), includeDevDeps: true })
}