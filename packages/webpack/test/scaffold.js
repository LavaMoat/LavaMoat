// @ts-check

const path = require('path')
const webpack = require('webpack')
const memfs = require('memfs')
const { toSnapshotSync } = require('memfs/lib/snapshot')
const { createContext, Script, runInNewContext } = require('vm')
const { readFileSync } = require('fs')

exports.scaffold = async function runWebpackBuild(webpackConfig) {
  // Resolve the root directory
  webpackConfig.context = path.resolve(__dirname, 'fixtures/main/')

  // Create a compiler instance
  const compiler = webpack(webpackConfig)

  // Use memfs to write the output to memory
  const memoryFs = memfs.createFsFromVolume(new memfs.Volume())
  compiler.outputFileSystem = memoryFs

  return new Promise((resolve, reject) => {
    // Run the compiler
    compiler.run((error, stats) => {
      if (error) {
        return reject(error)
      }
      if (!stats) {
        return reject(Error('no output from webpack'))
      }

      if (stats.hasErrors()) {
        console.error(stats.toString({ colors: true }))
        reject(Error('webpack build reported errors'))
      }

      // Get a snapshot of all files in the memory file system
      const snapshot = convertToMap(toSnapshotSync({ fs: memoryFs }))

      resolve({
        stdout: stats ? stats.toString({ colors: false }) : '',
        snapshot,
      })
    })
  })
}

function convertToMap(input, path = '') {
  let result = {}

  if (Array.isArray(input)) {
    if (input[2] instanceof Uint8Array) {
      // Convert Uint8Array to string with utf8 encoding
      let decoder = new TextDecoder('utf8')
      let stringValue = decoder.decode(input[2])
      result[path] = stringValue
    } else if (typeof input[2] === 'object') {
      // Recursively process nested objects
      for (let key in input[2]) {
        let nestedResult = convertToMap(input[2][key], path + '/' + key)
        result = { ...result, ...nestedResult }
      }
    }
  }

  return result
}

function runScript(code, globals = {}) {
  if (typeof code !== 'string' || code === '') {
    throw new Error('runScript requires a bundle string as the first argument')
  }
  const context = createContext(globals)
  return runInNewContext(code, context)
}
exports.runScript = runScript

function runScriptWithSES(bundle, globals = {}) {
  if (typeof bundle !== 'string' || bundle === '') {
    throw new Error(
      'runScriptWithSES requires a bundle string as the first argument',
    )
  }
  const lockdownCode = readFileSync(require.resolve('ses'), 'utf8')

  const code = `
    ;(()=>{
     ${lockdownCode}
    })();
    ${bundle}
  `
  return runScript(code, globals)
}
exports.runScriptWithSES = runScriptWithSES
