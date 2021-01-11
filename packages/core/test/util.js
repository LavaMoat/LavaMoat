const { parseForConfig, LavamoatModuleRecord, generateKernel, packageNameFromPath } = require('../src/index.js')
const mergeDeep = require('merge-deep')
const { runInNewContext } = require('vm')
const path = require('path')
const fromEntries = require('object.fromentries')

module.exports = {
  generateConfigFromFiles,
  createScenarioFromScaffold,
  runScenario
}

async function generateConfigFromFiles ({ files, ...opts }) {
  const config = await parseForConfig({
    moduleSpecifier: files.find(file => file.entry).specifier,
    resolveHook: (requestedName, parentAddress) => {
      return files.find(file => file.specifier === parentAddress).importMap[requestedName]
    },
    importHook: async (address) => {
      return new LavamoatModuleRecord(files.find(file => file.specifier === address))
    },
    isBuiltin: () => false,
    includeDebugInfo: false,
    ...opts
  })

  return config
}

function createScenarioFromScaffold ({
  files = [],
  builtin = [],
  config,
  defineEntry,
  defineOne,
  defineTwo,
  defineThree
} = {}) {
  function _defineEntry () {
    global.testResult.value = require('one')
  }

  function _defineOne () {
    module.exports = require('two')
  }

  function _defineTwo () {
    module.exports = {
      value: 'this is module two'
    }
  }

  function _defineThree () {
    module.exports = {
      value: 'this is module three'
    }
  }

  const _files = fillInFileDetails({
    'entry.js': {
      source: `(${defineEntry || _defineEntry}).call(this)`,
      package: '<root>',
      deps: {
        one: 'node_modules/one/index.js',
        two: 'node_modules/two/index.js'
      }
    },
    'node_modules/one/index.js': {
      package: 'one',
      source: `(${defineOne || _defineOne}).call(this)`,
      deps: {
        two: 'node_modules/two/index.js'
      }
    },
    'node_modules/two/index.js': {
      package: 'two',
      source: `(${defineTwo || _defineTwo}).call(this)`,
      deps: {}
    },
    'node_modules/three/index.js': {
      package: 'three',
      source: `(${defineThree || _defineThree}).call(this)`,
      deps: {}
    },
    ...filesFromBuiltin(builtin),
    ...files
  })

  const _config = mergeDeep({
    resources: {
      one: {
        packages: {
          two: true
        }
      }
    }
  }, config)

  return {
    entries: ['entry.js'],
    files: _files,
    config: _config
  }
}

async function runScenario ({ entries, files, config: lavamoatConfig }) {
  const kernelSrc = generateKernel({ debugMode: true })
  const { result: createKernel, context } = evaluateWithSourceUrl('LavaMoat/core-test/kernel', kernelSrc)
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData: (id) => {
      return files[id]
    },
    getRelativeModuleId: (id, relative) => {
      return files[id].deps[relative] || relative
    },
    prepareModuleInitializerArgs
  })

  entries.forEach(id => kernel.internalRequire(id))

  // run result through serialization boundary. this ensures these tests:
  // - work across a serialization boundary
  // - return simple objects non wrapped by membranes
  return JSON.parse(JSON.stringify(context.testResult.value))
}

function fillInFileDetails (files) {
  Object.entries(files).forEach(([file, moduleData]) => {
    moduleData.file = moduleData.file || file
    moduleData.package = moduleData.package || packageNameFromPath(file) || '<root>'
    moduleData.source = `(function(exports, require, module, __filename, __dirname){\n${moduleData.source}\n})`
    // moduleData.type = moduleData.type || 'js'
  })
  return files
}

function filesFromBuiltin (builtinObj) {
  return fromEntries(
    Object.entries(builtinObj)
      .map(([key, value]) => {
        return [key, {
          file: key,
          package: key,
          type: 'builtin',
          moduleInitializer: (_, _2, module) => { module.exports = value }
        }]
      })
  )
}

function prepareModuleInitializerArgs (requireRelativeWithContext, moduleObj, moduleData) {
  const require = requireRelativeWithContext
  const module = moduleObj
  const exports = moduleObj.exports
  const __filename = moduleData.file
  const __dirname = path.dirname(__filename)
  require.resolve = (requestedName) => {
    throw new Error('require.resolve not implemented in lavamoat-core test harness')
  }
  return [exports, require, module, __filename, __dirname]
}

function evaluateWithSourceUrl (filename, content, baseContext) {
  const context = Object.assign({}, baseContext)
  // circular ref (used when globalThis is not present)
  context.global = context
  context.console = console
  // apply testResult object
  context.testResult = {}
  // perform eval
  const result = runInNewContext(`${content}\n//# sourceURL=${filename}`, context)
  // pull out test result value from context (not always used)
  return { result, context }
}
