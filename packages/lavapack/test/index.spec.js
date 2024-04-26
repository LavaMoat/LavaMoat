const fs = require('node:fs')
const test = require('ava')
const { pipe, concat } = require('mississippi')
const { SourceMapConsumer } = require('source-map')
const convertSourceMap = require('convert-source-map')
const pack = require('../src')

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
  pipe(packStream, concat(resolve), callback)

  // add modules
  const modules = [
    {
      id: '1',
      sourceFile: 'index.js',
      source: "require('./log.js'); require('./util.js')",
      deps: {
        './log.js': '2',
        './util.js': '3',
      },
      entry: true,
    },
    {
      id: '2',
      sourceFile: 'log.js',
      source:
        `console.log('hi');\nnew Error('danger');\nconsole.log('the end');
        //# sourceMappingURL=data:application/json;charset=utf-8;base64,e30K
        /*# sourceMappingURL=data:application/json;charset=utf-8;base64,e30K
          }} invalid JS {{ /*
        */

          /*
          actual comment
          */
        `,
      deps: {},
    },
    {
      id: '3',
      sourceFile: 'util.js',
      source: 'module.exports.add = (a,b) => a+b',
      deps: {},
    },
  ]
  modules.forEach((moduleData) => {
    packStream.write(moduleData)
  })
  packStream.end()

  const bundleBuffer = await promise
  const bundleString = bundleBuffer.toString()
  t.log(bundleString)
  t.snapshot(bundleString)

  // for opening with sourcemap explorer
  fs.writeFileSync('./bundle.js', bundleBuffer)

  const converter = convertSourceMap.fromSource(bundleString)
  const rawSourceMap = converter.toObject()

  const consumer = await new SourceMapConsumer(rawSourceMap)
  modules.forEach(({ sourceFile }) => {
    const bundleStartPos = consumer.generatedPositionFor({
      source: sourceFile,
      line: 1,
      column: 0,
    })
    const bundleLine = bundleString.split('\n')[bundleStartPos.line - 1]
    t.log(`${sourceFile}:\n${bundleLine}`)
  })

  consumer.destroy()
  t.pass('no error thrown')
})

test('detect invalid module', (t) => {
  t.plan(2)
  const packStream = pack({
    raw: true,
    includePrelude: false,
    devMode: true,
    bundleWithPrecompiledModules: true,
  })
  t.throws(
    () => {
      packStream.write({
        id: '2',
        sourceFile: 'log.js',
        source: '>>invalid code<<',
        deps: {},
      })
    },
    { message: "Invalid JavaScript: Unexpected token '>>'" }
  )

  const packStream2 = pack({
    raw: true,
    includePrelude: true,
    devMode: true,
    bundleWithPrecompiledModules: false,
  })
  t.throws(
    () => {
      packStream2.write({
        id: '2',
        sourceFile: 'log.js',
        source: '>>invalid code<<',
        deps: {},
      })
    },
    { message: "Invalid JavaScript: Unexpected token '>>'" }
  )
})

// TODO: use https://github.com/tc39/proposal-promise-with-resolvers when available
function deferred() {
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
