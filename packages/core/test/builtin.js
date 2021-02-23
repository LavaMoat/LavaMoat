const test = require('ava')
const {
  createScenarioFromScaffold,
  runScenario,
  runAndTestScenario
} = require('./util.js')

test('builtin - basic access', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      let abc = null; let xyz = null
      try { abc = require('abc') } catch (_) {}
      try { xyz = require('xyz') } catch (_) {}

      module.exports = { abc, xyz }
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
    },
    expectedResult: { abc: 123, xyz: null },
    builtin: {
      abc: 123
    }
  })

  await runAndTestScenario(t, scenario, runScenario)
})

test('builtin - access via paths', async (t) => {
  const scenario = createScenarioFromScaffold({
    defineOne: () => {
      module.exports = require('abc')
    },
    config: {
      resources: {
        one: {
          builtin: {
            'abc.xyz': true
          }
        }
      }
    },
    expectedResult: { xyz: 123 },
    builtin: {
      abc: {
        xyz: 123,
        ijk: 456
      }
    }
  })

  await runAndTestScenario(t, scenario, runScenario)
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
    },
    expectedResult: {
      overrideCheck: true,
      thisCheck: true,
      classCheck: true
    },
    builtin: {
      buffer: require('buffer'),
      thisChecker: (() => { const parent = {}; parent.check = function () { return this === parent }; return parent })(),
      someClass: { SomeClass: class SomeClass {} }
    }
  })

  await runAndTestScenario(t, scenario, runScenario)
})
