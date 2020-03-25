#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

runLava().catch(console.error)

async function runLava () {
  const [,,entryPath] = process.argv
  const entryDir = process.cwd()
  const relativeRequire = createRelativeRequire(entryDir)
  relativeRequire(entryPath)
}

function createRelativeRequire (dir) {
  return function relativeRequire (id) {
    console.log(`requireRelative: ${dir} -> ${id}`)
    const fullPath = path.resolve(dir, id)
    const resolved = require.resolve(fullPath)
    return absoluteRequire(resolved)
  }
}

function absoluteRequire (modulePath) {
  const moduleDir = path.parse(modulePath).dir
  const moduleContent = fs.readFileSync(modulePath)
  const wrappedContent = `(function(module,exports,require){${moduleContent}})`
  const moduleInitializer = eval(wrappedContent)

  const moduleObj = { exports: {} }
  const relativeRequire = createRelativeRequire(moduleDir)
  moduleInitializer(moduleObj, moduleObj.exports, relativeRequire)
  const moduleExports = moduleObj.exports
  return moduleExports
}