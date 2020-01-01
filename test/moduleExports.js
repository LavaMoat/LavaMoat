const test = require('tape-promise').default(require('tape'))
const { createBundleFromRequiresArray } = require('./util')
const {
  runSimpleOneTwo,
} = require('./util')

test('moduleExports - decorate an import - object', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: `global.testResult = require('test').xyz`,
    entry: true
  }, {
    // non-entry
    id: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    deps: {
      './alt': './node_modules/test/alt.js'
    },
    source: `
      const alt = require('./alt')
      alt.xyz = 42
      module.exports = alt
    `,
  }, {
    // non-entry
    id: './node_modules/test/alt.js',
    file: './node_modules/test/alt.js',
    deps: {},
    source: `module.exports = {}`,
  }]

  const config = {
    "resources": {
      "<root>": {
        "packages": {
          "test": true,
        }
      }
    }
  }

  const result = await evalModulesArray(t, { files, pluginOpts: { lavamoatConfig: config } })
  t.equal(result, 42)
})

test('moduleExports - decorate an import - function', async (t) => {
  function defineOne() {
    const two = require('two')
    try {
      two.xyz = 42
    } catch (error) {
      module.exports = two
    }
  }
  function defineTwo() {
    module.exports = () => 100
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo })
  const result = {call: one(), xyz: one.xyz}

  t.deepEqual(result, { call: 100, xyz: undefined })
})

test('moduleExports - decorate an import - class syntax', async (t) => {
  function defineOne() {
    const modernClass = require('two')
    try {
      modernClass.xyz = 42
    } catch (error) {
      module.exports = modernClass
   }
  }
  function defineTwo() {
    class ModernClass {
      constructor() {
        this.abc = 123
      }
    }
    ModernClass.jkl = 101
    module.exports = ModernClass
  }

  const exportedModernClass = await runSimpleOneTwo({ defineOne, defineTwo })
  const instance = new exportedModernClass()

  t.equal(instance.abc, 123)
  t.equal(exportedModernClass.jkl, 101)
  t.equal(exportedModernClass.xyz, undefined)
})

test('moduleExports - decorate an import - class syntax subclass', async (t) => {
  function defineOne() {
    const BaseClass = require('two')

    class NewClass extends BaseClass {
      constructor() {
        super()
        this.abc = 456
      }
    }

    module.exports = NewClass
  }
  function defineTwo() {
    class BaseClass {
      constructor() {
        this.abc = 123
      }
    }
    BaseClass.jkl = 101
    module.exports = BaseClass
  }

  const NewClass = await runSimpleOneTwo({ defineOne, defineTwo })
  const instance = new NewClass()

  const result = {
    abc: instance.abc,
    jkl: NewClass.jkl,
  }

  t.deepEqual(result, {
    abc: 456,
    jkl: 101,
  })
})

test('moduleExports - bridged array passes Array.isArray', async (t) => {
  function defineOne() {
    const two = require('two')
    module.exports = two
  }
  function defineTwo() {
    module.exports = [1, 2, 3]
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo })
  const result = Array.isArray(one)
  t.deepEqual(result, true)
})

test('object returned from exported function should be mutable', async (t) => {
  function defineOne() {
    const two = require('two')
    const one = two.xyz()
    one.abc = 123
    module.exports = one
  }
  function defineTwo() {
    module.exports = { xyz: () => ({}) }
  }
  const one = await runSimpleOneTwo({ defineOne, defineTwo })

  t.equal(one.abc, 123, "Object should be mutable")
}) 

async function evalModulesArray(t, { files, pluginOpts = {} }) {
  const bundle = await createBundleFromRequiresArray(files, pluginOpts)

  global.testResult = undefined

  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }

  return global.testResult
}