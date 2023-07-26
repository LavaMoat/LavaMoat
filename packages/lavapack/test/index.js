const fs = require('fs')
const test = require('ava')
const { pipe, from, concat } = require('mississippi')
const { SourceMapConsumer } = require('source-map')
const convertSourceMap = require('convert-source-map')
const pack = require('../')


test('dummy test', (t) => {
  pack({
    includePrelude: false,
  })
  t.pass('no error thrown')
})

test('sourcemap test', async (t) => {
  const packStream = pack({
    raw: true,
    includePrelude: false,
    devMode: true,
    // hasExports: true,
    bundleWithPrecompiledModules: true,
  })

  // concat pack into a buffer
  const { promise, resolve, callback } = deferred()
  pipe(
    packStream,
    concat(resolve),
    callback,
  )

  // add modules
  const modules = [{
    id: '1',
    sourceFile: 'index.js',
    source: 'require(\'./log.js\'); require(\'./util.js\')',
    deps: {
      './log.js': '2',
      './util.js': '3',
    },
    entry: true,
  }, {
    id: '2',
    sourceFile: 'log.js',
    source: 'console.log(\'hi\');\nnew Error(\'danger\');\nconsole.log(\'the end\');',
    deps: {},
  }, {
    id: '3',
    sourceFile: 'util.js',
    source: 'module.exports.add = (a,b) => a+b',
    deps: {},
  }]
  modules.forEach(moduleData => {
    packStream.write(moduleData)
  })
  packStream.end()

  const bundleBuffer = await promise
  const bundleString = bundleBuffer.toString()
  console.log(bundleString)
  fs.writeFileSync('./bundle.js', bundleBuffer)

  const converter = convertSourceMap.fromSource(bundleString)
  const rawSourceMap = converter.toObject()

  const consumer = await new SourceMapConsumer(rawSourceMap)
  modules.forEach(({ sourceFile }) => {
    const bundleStartPos = consumer.generatedPositionFor({ source: sourceFile, line: 1, column: 0 })
    const bundleLine = bundleString.split('\n')[bundleStartPos.line - 1]
    console.log(`${sourceFile}:\n${bundleLine}`)
  })
  
  consumer.destroy()
  t.pass('no error thrown')
})

function deferred () {
  const result = {}
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve
    result.reject = reject
    result.callback = (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    }
  })
  return result
}
