#!/usr/bin/env node

const path = require('path')
const fs = require('fs')
const { generateKernel } = require('lavamoat-core')
const { packageDataForModule } = require('lavamoat-browserify/src/packageData')


runLava().catch(console.error)

function createKernel () {
  const lavamoatConfig = {}
  const createKernel = eval(generateKernel())
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
  })
  return kernel
}

function loadModuleData (absolutePath) {
  console.log('loadModuleData', absolutePath)
  const moduleContent = fs.readFileSync(absolutePath)
  const wrappedContent = `(function(require,module,exports){${moduleContent}})`
  const packageData = packageDataForModule({ file: absolutePath })
  const packageName = packageData.packageName || '<root>'

  return {
    file: absolutePath,
    package: packageName,
    source: wrappedContent,
    sourceString: wrappedContent,
  }
}

function getRelativeModuleId (parentAbsolutePath, relativePath) {
  const parentDir = path.parse(parentAbsolutePath).dir
  const fullPath = path.resolve(parentDir, relativePath)
  const resolved = require.resolve(fullPath)
  return resolved
}

async function runLava () {
  const [,,entryPath] = process.argv
  const entryDir = process.cwd()
  const kernel = createKernel()
  const entryId = path.resolve(entryDir, entryPath)
  kernel.internalRequire(entryId)
}
