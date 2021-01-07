const { runInNewContext } = require('vm')
const path = require('path')
const test = require('ava')
const mergeDeep = require('merge-deep')
const fromEntries = require('object.fromentries')
const { generateKernel, packageNameFromPath } = require('../src/index.js')

test('builtin - basic access', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      let abc = null; let xyz = null
      try { abc = require('abc') } catch (_) {}
      try { xyz = require('xyz') } catch (_) {}

      module.exports = { abc, xyz }
    },
    builtin: {
      abc: 123
    },
    config: {
      resources: {
        one: {
          builtin: {
            abc: true,
            xyz: false
          }
        }
      }
    }
  })
  const result = await runScenario(scenario)
  t.deepEqual(result, { abc: 123, xyz: null })
})

test('builtin - access via paths', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = require('abc')
    },
    builtin: {
      abc: {
        xyz: 123,
        ijk: 456
      }
    },
    config: {
      resources: {
        one: {
          builtin: {
            'abc.xyz': true
          }
        }
      }
    }
  })

  const result = await runScenario(scenario)
  t.deepEqual(result, { xyz: 123 })
})

test('builtin - paths soft-bindings preserve "this" but allow override', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      const { Buffer } = require('buffer')
      const two = require('two')
      module.exports = {
        overrideCheck: two.overrideCheck(Buffer.from([1, 2, 3])),
        thisCheck: two.thisCheck(),
        classCheck: two.classCheck()
      }
    },

    defineTwo: () => {
      const { Buffer } = require('buffer')
      const thisChecker = require('thisChecker')
      const { SomeClass } = require('someClass')
      // this test ensures "Buffer.prototype.slice" is copied in a way that allows "this" to be overridden
      module.exports.overrideCheck = (buf) => Buffer.prototype.slice.call(buf, 1, 2)[0] === buf[1]
      // this test ensures "Buffer.prototype.slice" is copied in a way that allows "this" to be overridden
      module.exports.thisCheck = () => thisChecker.check()
      // this test ensures class syntax works, with its required use of the "new" keyword
      module.exports.classCheck = () => {
        try {
          // eslint-disable-next-line no-new
          new SomeClass()
        } catch (err) {
          return false
        }
        return true
      }
    },
    builtin: {
      buffer: require('buffer'),
      thisChecker: (() => { const parent = {}; parent.check = function () { return this === parent }; return parent })(),
      someClass: { SomeClass: class SomeClass {} }
    },
    config: {
      resources: {
        one: {
          builtin: {
            'buffer.Buffer.from': true
          }
        },
        two: {
          builtin: {
            // these paths are carefully constructed to try and split the fn from its parent
            'buffer.Buffer.prototype.slice': true,
            'thisChecker.check': true,
            'someClass.SomeClass': true
          }
        }
      }
    }
  })

  const result = await runScenario(scenario)
  t.deepEqual(result, {
    overrideCheck: true,
    thisCheck: true,
    classCheck: true
  })
})

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
