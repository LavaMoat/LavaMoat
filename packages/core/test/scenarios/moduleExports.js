const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - decorate an import - object',
      defineOne: () => {
        const two = require('two')
        two.xyz = 42
        module.exports = two
      },
      defineTwo: () => {
        module.exports = {}
      },
      expectedResult: {
        xyz: 42
      }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - decorate an import - function',
      defineOne: () => {
        const two = require('two')
        two.xyz = 42
        module.exports = {
          xyz: two.xyz,
          call: two()
        }
      },
      defineTwo: () => {
        module.exports = () => 100
      },
      expectedResult: {
        xyz: 42,
        call: 100
      }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - decorate an import - class syntax',
      defineOne: () => {
        const ModernClass = require('two')
        ModernClass.xyz = 42
        module.exports = {
          abc: new ModernClass().abc,
          jkl: ModernClass.jkl,
          xyz: ModernClass.xyz
        }
      },
      defineTwo: () => {
        class ModernClass {
          constructor () {
            this.abc = 123
          }
        }
        ModernClass.jkl = 101
        module.exports = ModernClass
      },
      expectedResult: {
        abc: 123,
        jkl: 101,
        xyz: 42
      }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - decorate an import - class syntax subclass',
      defineOne: () => {
        const BaseClass = require('two')
        class NewClass extends BaseClass {
          constructor () {
            super()
            this.abc = 456
          }
        }
        module.exports = {
          abc: new NewClass().abc,
          jkl: NewClass.jkl
        }
      },
      defineTwo: () => {
        class BaseClass {
          constructor () {
            this.abc = 123
          }
        }
        BaseClass.jkl = 101
        module.exports = BaseClass
      },
      expectedResult: {
        abc: 456,
        jkl: 101
      }
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - bridged array passes Array.isArray',
      defineOne: () => {
        const two = require('two')
        module.exports = Array.isArray(two)
      },
      defineTwo: () => {
        module.exports = [1, 2, 3]
      },
      expectedResult: true
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - object returned from exported function should be mutable',
      defineOne: () => {
        const two = require('two')
        const one = two.xyz()
        one.abc = 123
        module.exports = one.abc
      },
      defineTwo: () => {
        module.exports = { xyz: () => ({}) }
      },
      expectedResult: 123
    })
    return scenario
  },
  async () => {
    const testObj = {}
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - <endowments> membrane space should round-trip correctly in packages',
      defineOne: () => {
        const two = require('two')
        const getResult = two.get()
        const checkResult = globalThis.check(getResult)
        module.exports = checkResult
      },
      defineTwo: () => {
        module.exports = {
          get: () => globalThis.get()
        }
      },
      config: {
        resources: {
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
      },
      context: {
        get: () => testObj,
        check: (target) => target === testObj
      },
      expectedResult: true
    })
    return scenario
  },
  async () => {
    const testObj = {}
    const scenario = createScenarioFromScaffold({
      name: 'moduleExports - <endowments> membrane space should round-trip correctly in <root>',
      defineEntry: () => {
        const one = require('one')
        const getResult = one.get()
        const checkResult = globalThis.check(getResult)
        console.log(JSON.stringify(checkResult, null, 2))
      },
      defineOne: () => {
        module.exports = {
          get: () => globalThis.get()
        }
      },
      config: {
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
      },
      context: {
        get: () => testObj,
        check: (target) => target === testObj
      },
      expectedResult: true
    })
    return scenario
  }
]
