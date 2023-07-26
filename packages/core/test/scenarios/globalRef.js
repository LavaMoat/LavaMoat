const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalRef - check default containment',
      defineOne: () => {
        const testResults = {}
        try {
          testResults.objCheckThis = this.Object === Object 
        } catch (_) { }
        try {
          testResults.objCheckGlobal = globalThis.Object === Object 
        } catch (_) { }
        try {
          testResults.thisIsExports = exports === this 
        } catch (_) { }
        module.exports = testResults
      },
      expectedResult: {
        objCheckThis: false,
        objCheckGlobal: true,
        thisIsExports: true,
      },
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalRef - Webpack code in the wild works',
      // modified from Webpack builds
      defineOne: () => {
        let g

        // This works in non-strict mode
        // otherwise undefined
        g = (function () {
          return this
        })()

        let error
        try {
          // This works if eval is allowed (see CSP)
          /* eslint-disable no-new-func */
          g = g || new Function('return this')()
        } catch (e) {
          error = e
          // This works if the window reference is available
          if (typeof window === 'object') {
            g = window
          }
        }
        // test webpack result against globalThis
        module.exports = { match: g === globalThis, type: typeof g, error: error && error.message }
      },
      expectedResult: { match: true, type: 'object' },
    })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'globalRef - globalRef workaround doesnt break instanceof Function',
      defineOne: () => {
        module.exports = function () {} instanceof globalThis.Function
      },
      expectedResult: true,
    })
    return scenario
  },
]
