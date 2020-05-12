const test = require('tape-promise').default(require('tape'))
const {
  runSimpleOneTwo
} = require('./util')

test('endowments - bridged endowments matches original endowments object', async (t) => {
  function defineOne () {
    const two = require('two')
    module.exports = global.testCheck(two)
  }
  function defineTwo () {
    module.exports = global.testGet()
  }
  const testObj = {}
  const testGlobal = {
    testGet: () => {
      console.log(`Test Get: ${testObj}`)
      return testObj
    },
    testCheck: (target) => {
      console.log(`Test Check: target: ${target} testObj: ${testObj}`)
      return target === testObj
    }
  }

  const config = {
    resources: {
      one: {
        globals: {
          testCheck: true
        }
      },
      two: {
        globals: {
          testGet: true
        }
      }
    }
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo, config, testGlobal })

  t.equal(one, true)
})
