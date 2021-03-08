const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalRef - check default containment',
      defineOne: () => {
        const testResults = {}
        try { testResults.objCheckThis = this.Object === Object } catch (_) { }
        try { testResults.objCheckGlobal = globalThis.Object === Object } catch (_) { }
        try { testResults.thisIsExports = exports === this } catch (_) { }
        module.exports = testResults
      },
      expectedResult: {
        objCheckThis: false,
        objCheckGlobal: true,
        thisIsExports: true
      }
    })
    return scenario
  }
]
