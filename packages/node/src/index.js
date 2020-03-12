#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

runLava().catch(console.error)

async function runLava () {
  const [,,target] = process.argv
  const relativeRequire = createRelativeRequire(process.cwd())
  relativeRequire(target)
}

function createRelativeRequire (cwd) {
  return function relativeRequire (id) {
    console.log(`requireRelative: ${cwd} -> ${id}`)
    const fullPath = path.resolve(cwd, id)
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