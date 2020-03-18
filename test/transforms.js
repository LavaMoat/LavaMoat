const test = require('tape')
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
  t.ok(one)
  t.end()
})

// this originally required a transform but does not any more
// we still need to ensure this pattern works
test('transforms - common pattern "_inheritsLoose" works', async (t) => {
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
  t.ok(one)
  t.end()
})
