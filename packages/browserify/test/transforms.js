const test = require('ava')
const { runSimpleOneTwo } = require('./util')
const { applyInheritsLooseWorkaround } = require('../src/sesTransforms')

test('transforms - Ses transforms work', async (t) => {
  function defineOne () {
    const two = require('two')
    module.exports = two
  }
  function defineTwo () {
    const comment = '-->'
    const importString = 'import x from "y"'
    module.exports = { comment, importString }
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo })
  t.truthy(one)
})

// this originally required a transform but does not any more
// we still need to ensure this pattern works
test('transforms - common pattern "_inheritsLoose" works with TypeError', async (t) => {
  function defineOne () {
    const two = require('two')
    module.exports = two
  }
  function defineTwo () {
    function SubError () {}
    _inheritsLoose(SubError, TypeError)
    function _inheritsLoose (t, e) { t.prototype = Object.create(e.prototype), (t.prototype.constructor = t).__proto__ = e }
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo })
  t.truthy(one)
})

test('transforms - common pattern "_inheritsLoose" works across package boundaries', async (t) => {
  function defineOne () {
    const SuperClass = require('two')
    function SubClass () {}
    _inheritsLoose(SubClass, SuperClass)
    module.exports = SubClass
    function _inheritsLoose (t, e) { t.prototype = Object.create(e.prototype), (t.prototype.constructor = t).__proto__ = e }
  }
  function defineTwo () {
    function SuperClass () {}
    module.exports = SuperClass
  }

  const one = await runSimpleOneTwo({ defineOne, defineTwo })
  t.truthy(one)
})
