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

test('transforms - inheritsLoose workaround', async (t) => {
  const input = `${function () {
    // minified 1
    function _inheritsLoose (t, e) { t.prototype = Object.create(e.prototype), (t.prototype.constructor = t).__proto__ = e }
    // minified 2
    function _inheritsLoose (e, r) { e.prototype = Object.create(r.prototype), (e.prototype.constructor = e).__proto__ = r }
    // formatted
    function _inheritsLoose (subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass }
    // newlines
    function _inheritsLoose (subClass, superClass) {
      subClass.prototype = Object.create(superClass.prototype)
      subClass.prototype.constructor = subClass
      subClass.__proto__ = superClass
    }
  }}`
  const result = applyInheritsLooseWorkaround(input)
  t.equal(result, `${function () {
    // minified 1
    function _inheritsLoose (subClass, superClass) { subClass.prototype = Object.create(superClass.prototype, { constructor: { value: subClass } }); subClass.__proto__ = superClass }
    // minified 2
    function _inheritsLoose (subClass, superClass) { subClass.prototype = Object.create(superClass.prototype, { constructor: { value: subClass } }); subClass.__proto__ = superClass }
    // formatted
    function _inheritsLoose (subClass, superClass) { subClass.prototype = Object.create(superClass.prototype, { constructor: { value: subClass } }); subClass.__proto__ = superClass }
    // newlines
    function _inheritsLoose (subClass, superClass) { subClass.prototype = Object.create(superClass.prototype, { constructor: { value: subClass } }); subClass.__proto__ = superClass }
  }}`)
  t.end()
})
