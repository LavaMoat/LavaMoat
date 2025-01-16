const path = require('node:path')
const webpack = require('webpack')
const memfs = require('memfs')
const { toSnapshotSync } = require('memfs/lib/snapshot')
const { createContext, runInNewContext } = require('node:vm')
const { readFileSync } = require('node:fs')

/**
 * Run a webpack build and return the output
 *
 * @param {import('webpack').Configuration} webpackConfig
 * @param {object} options
 * @param {boolean} [options.writeFS] - Whether to write the output to the file
 *   system
 * @returns {Promise<{ stdout: string; snapshot?: Record<string, string> }>}
 */
exports.scaffold = async function runWebpackBuild(
  webpackConfig,
  { writeFS = false } = {}
) {
  // Resolve the root directory
  webpackConfig.context = path.resolve(__dirname, 'fixtures/main/')

  // Create a compiler instance
  const compiler = webpack(webpackConfig)
  /**
   * @type {memfs.IFs}
   */
  let fs

  if (!writeFS) {
    // Use memfs to write the output to memory
    const memoryFs = memfs.createFsFromVolume(new memfs.Volume())
    compiler.outputFileSystem = memoryFs
    fs = memoryFs
  }

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
        const err = Error('webpack build reported errors')
        err.compilationErrors = stats.compilation.errors
        reject(err)
      }

      let snapshot
      if (!writeFS) {
        // Get a snapshot of all files in the memory file system
        snapshot = convertToMap(toSnapshotSync({ fs }))
      }

      resolve({
        stdout: stats ? stats.toString({ colors: false }) : '',
        snapshot,
      })
    })
  })
}

/**
 * Convert a memfs snapshot to a map
 *
 * @param {import('memfs/lib/snapshot').SnapshotNode} input
 * @param {string} [path]
 * @returns {Record<string, any>}
 */
function convertToMap(input, path = '') {
  /** @type {Record<string, any>} */
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

const silentConsole = Object.keys(console).reduce((acc, key) => {
  acc[key] = () => {}
  return acc
}, {})

const defaultGlobals = () => ({
  console: silentConsole,
  // these are necessary for webpack's runtime
  document: {},
  self: { location: { href: 'https://localhost/' } },
  URL,
})

/**
 * Run a script in a new context, without SES
 *
 * @param {string} code
 * @param {Record<string, any>} globals
 * @returns {any}
 */
function runScript(code, globals = defaultGlobals()) {
  if (typeof code !== 'string' || code === '') {
    throw new Error('runScript requires a bundle string as the first argument')
  }
  const context = createContext(globals)
  return {
    context,
    result: runInNewContext(code, context),
  }
}
exports.runScript = runScript

/**
 * Run a script with SES
 *
 * @param {string} bundle
 * @param {Record<string, any>} globals
 * @returns {any}
 */
function runScriptWithSES(bundle, globals = defaultGlobals()) {
  if (typeof bundle !== 'string' || bundle === '') {
    throw new Error(
      'runScriptWithSES requires a bundle string as the first argument'
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
