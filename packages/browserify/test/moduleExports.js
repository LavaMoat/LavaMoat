const test = require('ava')
const {
  runSimpleOneTwo,
  runSimpleOneTwoSamePackage
} = require('./util')

test('moduleExports - decorate an import - object', async (t) => {
  function defineOne () {
    const two = require('two')
    two.xyz = 42
    module.exports = two
  }
  function defineTwo () {
    module.exports = {}
  }

  const one = await runSimpleOneTwoSamePackage({ defineOne, defineTwo })

  t.is(one.xyz, 42)
})

test('moduleExports - decorate an import - function', async (t) => {
  function defineOne () {
    const two = require('two')
    two.xyz = 42
    module.exports = two
  }
  function defineTwo () {
    module.exports = () => 100
  }

  const one = await runSimpleOneTwoSamePackage({ defineOne, defineTwo })
  const result = { call: one(), xyz: one.xyz }

  t.deepEqual(result, { call: 100, xyz: 42 })
})

test('moduleExports - decorate an import - class syntax', async (t) => {
  function defineOne () {
    const modernClass = require('two')
    modernClass.xyz = 42
    module.exports = modernClass
  }
  function defineTwo () {
    class ModernClass {
      constructor () {
        this.abc = 123
      }
    }
    ModernClass.jkl = 101
    module.exports = ModernClass
  }

  const exportedModernClass = await runSimpleOneTwoSamePackage({ defineOne, defineTwo })
  const instance = new exportedModernClass()

  const result = {
    abc: instance.abc,
    jkl: exportedModernClass.jkl,
    xyz: exportedModernClass.xyz
  }
  t.deepEqual(result, {
    abc: 123,
    jkl: 101,
    xyz: 42
  })
})

test('moduleExports - decorate an import - class syntax subclass', async (t) => {
  function defineOne () {
    const BaseClass = require('two')

    class NewClass extends BaseClass {
      constructor () {
        super()
        this.abc = 456
      }
    }

    module.exports = NewClass
  }
  function defineTwo () {
    class BaseClass {
      constructor () {
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
    jkl: NewClass.jkl
  }

  t.deepEqual(result, {
    abc: 456,
    jkl: 101
  })
})

test('moduleExports - bridged array passes Array.isArray', async (t) => {
  function defineOne () {
    const two = require('two')
    module.exports = two
  }
  function defineTwo () {
    module.exports = [1, 2, 3]
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo })
  const result = Array.isArray(one)
  t.deepEqual(result, true)
})

test('moduleExports - object returned from exported function should be mutable', async (t) => {
  function defineOne () {
    const two = require('two')
    const one = two.xyz()
    one.abc = 123
    module.exports = one
  }
  function defineTwo () {
    module.exports = { xyz: () => ({}) }
  }
  const one = await runSimpleOneTwo({ defineOne, defineTwo })

  t.is(one.abc, 123, 'Object should be mutable')
})

test('moduleExports - <endowments> membrane space should round-trip correctly in packages', async (t) => {
  const testObj = {}
  const testGlobal = {
    get: () => testObj,
    check: (target) => target === testObj,
  }

  function defineOne () {
    const two = require('two')
    const getResult = two.get()
    const checkResult = global.check(getResult)
    module.exports = checkResult
  }

  function defineTwo () {
    module.exports = {
      get: () => global.get()
    }
  }

  const config = {
    resources: {
      '<root>': {
        packages: {
          one: true
        }
      },
      one: {
        globals: {
          check: true
        }
      },
      two: {
        globals: {
          get: true
        }
      }
    }
  }

  const result = await runSimpleOneTwo({ defineOne, defineTwo, config, testGlobal })

  t.is(result, true, 'endowments round tripped correctly')
  })


test('moduleExports - <endowments> membrane space should round-trip correctly in <root>', async (t) => {
  const testObj = {}
  const testGlobal = {
    get: () => testObj,
    check: (target) => target === testObj,
  }

  function defineRoot () {
    const one = require('one')
    const getResult = one.get()
    const checkResult = global.check(getResult)
    global.testResult.value = checkResult
  }

  function defineOne () {
    module.exports = {
      get: () => global.get()
    }
  }

  const config = {
    resources: {
      '<root>': {
        packages: {
          one: true
        },
        globals: {
          check: true
        }
      },
      one: {
        globals: {
          get: true
        }
      }
    }
  }

  const result = await runSimpleOneTwo({ defineRoot, defineOne, config, testGlobal })

  t.is(result, true, 'endowments round tripped correctly')
  })
