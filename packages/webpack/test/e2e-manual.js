// run this with node to produce the test build to disk
const fs = require('node:fs')
const path = require('node:path')
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const webpackConfigDefault = require('./fixtures/main/webpack.config.js')
const webpackConfig = {
  ...webpackConfigDefault,
  // mode: 'development',
  // devtool: false,
}

const now = new Date().toISOString()

const cache = new Set()
function assertFolderFor(file) {
  const folder = path.dirname(file)
  if (cache.has(folder)) return
  const target = folder.replace(/^\//, '')
  fs.mkdirSync(path.join('.', 'tmp', now, target), { recursive: true })
  cache.add(folder)
}

function writeFromSnapshot(snapshot) {
  const files = Object.keys(snapshot)
  for (const file of files) {
    assertFolderFor(file)
    fs.writeFileSync(path.join('.', 'tmp', now, file), snapshot[file])
  }
}

scaffold(webpackConfig).then(({ stdout, snapshot }) => {
  console.log(stdout)
  writeFromSnapshot(snapshot)
  runScriptWithSES(snapshot['/dist/app.js'])
})
