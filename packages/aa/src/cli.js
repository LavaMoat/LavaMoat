#!/usr/bin/env node

const { loadCanonicalNameMap } = require('./index.js')


start().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function start () {
  // log all package names, optionally filtered by a package self-name
  const [,,filterKey] = process.argv
  const canonicalNameMap = await loadCanonicalNameMap({ rootDir: process.cwd(), includeDevDeps: true }) 
  for (const logicalName of canonicalNameMap.values()) {
    if (filterKey !== undefined) {
      const parts = logicalName.split('>')
      const lastPart = parts[parts.length - 1]
      if (lastPart !== filterKey) {
        continue
      }
    }
    console.log(logicalName)
  }
}
