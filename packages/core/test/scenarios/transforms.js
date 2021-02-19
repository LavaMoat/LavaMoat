const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'transforms - Ses transforms work',
      defineOne: () => {
        const two = require('two')
        module.exports = two
      },
      defineTwo: () => {
        const comment = '-->'
        const importString = 'import x from "y"'
        module.exports = { comment, importString }
      },
      testType: 'truthy'
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      // this originally required a transform but does not any more
      // we still need to ensure this pattern works
      name: 'transforms - common pattern "_inheritsLoose" works with TypeError',
      defineOne: () => {
        const two = require('two')
        module.exports = { two }
      },
      defineTwo: () => {
        function SubError () {}
        _inheritsLoose(SubError, TypeError)
        /* eslint-disable */
        function _inheritsLoose (t, e) { t.prototype = Object.create(e.prototype), (t.prototype.constructor = t).__proto__ = e }
        module.exports = SubError
        /* eslint-enable */
      },
      testType: 'truthy'
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'transforms - common pattern "_inheritsLoose" works across package boundaries',
      defineOne: () => {
        /* eslint-disable */
        const SuperClass = require('two')
        function SubClass () {}
        _inheritsLoose(SubClass, SuperClass)
        module.exports = { SubClass }
        function _inheritsLoose (t, e) { t.prototype = Object.create(e.prototype), (t.prototype.constructor = t).__proto__ = e }
        /* eslint-enable */
      },
      defineTwo: () => {
        function SuperClass () {}
        module.exports = SuperClass
      },
      testType: 'truthy'
    })
    return scenario
  }
]
