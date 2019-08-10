const test = require('tape-promise').default(require('tape'))
const { createBundleFromRequiresArray } = require('./util')

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

  const result = await evalModulesArray(t, { files })
  t.equal(result, 42)
})

test('moduleExports - decorate an import - function', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: `
      const test = require('test')
      global.testResult = { call: test(), xyz: test.xyz }
    `,
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
    source: `module.exports = () => 100`,
  }]

  const result = await evalModulesArray(t, { files })
  t.deepEqual(result, { call: 100, xyz: 42 })
})


test('moduleExports - decorate an import - function class', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: `
      const FunctionClass = require('test')
      const instance = new FunctionClass()
      global.testResult = {
        abc: instance.abc,
        jkl: instance.jkl(),
        xyz: FunctionClass.xyz,
      }
    `,
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
    source: `
      module.exports = FunctionClass
      function FunctionClass () { this.abc = 123 }
      FunctionClass.prototype.jkl = () => 'yes'
    `,
  }]

  const result = await evalModulesArray(t, { files })
  t.deepEqual(result, { abc: 123, jkl: 'yes', xyz: 42 })
})

test('moduleExports - decorate an import - class syntax', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: `
      const ModernClass = require('test')
      const instance = new ModernClass()
      
      global.testResult = {
        abc: instance.abc,
        jkl: ModernClass.jkl,
        xyz: ModernClass.xyz,
       }
    `,
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
    source: `
      class ModernClass {
        constructor () {
          this.abc = 123
        }
      }
      ModernClass.jkl = 101
      module.exports = ModernClass
    `,
  }]

  const result = await evalModulesArray(t, { files })
  t.deepEqual(result, {
    abc: 123,
    jkl: 101,
    xyz: 42
  })
})


test('moduleExports - decorate an import - class syntax subclass', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: `
      const NewClass = require('test')
      const instance = new NewClass()
      
      global.testResult = {
        abc: instance.abc,
        jkl: NewClass.jkl,
       }
    `,
    entry: true
  }, {
    // non-entry
    id: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    deps: {
      './alt': './node_modules/test/alt.js'
    },
    source: `
      const BaseClass = require('./alt')
      
      class NewClass extends BaseClass {
        constructor () {
          super()
          this.abc = 456
        }
      }

      module.exports = NewClass
    `,
  }, {
    // non-entry
    id: './node_modules/test/alt.js',
    file: './node_modules/test/alt.js',
    deps: {},
    source: `
      class BaseClass {
        constructor () {
          this.abc = 123
        }
      }
      BaseClass.jkl = 101
      module.exports = BaseClass
    `,
  }]

  const result = await evalModulesArray(t, { files })
  t.deepEqual(result, {
    abc: 456,
    jkl: 101,
  })
})


test('moduleExports - exported array passes Array.isArray', async (t) => {
  const files = [{
    // id must be full path
    id: './entry.js',
    file: './entry.js',
    deps: {
      'test': './node_modules/test/index.js'
    },
    source: `
      const result = require('test')
      global.testResult = Array.isArray(result)
    `,
    entry: true
  }, {
    // non-entry
    id: './node_modules/test/index.js',
    file: './node_modules/test/index.js',
    deps: {},
    source: `
      module.exports = [1,2,3]
    `,
  }]

  const result = await evalModulesArray(t, { files })
  t.deepEqual(result, true)
})

async function evalModulesArray (t, { files, pluginOpts = {} }) {
  const bundle = await createBundleFromRequiresArray(files, pluginOpts)

  global.testResult = undefined

  try {
    eval(bundle)
  } catch (err) {
    t.fail(`eval of bundle failed:\n${err.stack || err}`)
  }

  return global.testResult
}