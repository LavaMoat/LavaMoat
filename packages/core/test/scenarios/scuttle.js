const {
  createScenarioFromScaffold,
  autoConfigForScenario,
} = require('../util.js')

const one = () => {
  let globalObject = globalThis
  if (globalThis.getTrueGlobalThisForTestsOnly) {
    globalObject = globalThis.getTrueGlobalThisForTestsOnly()
  }
  // this will throw if scuttling fails
  if (globalObject.AAA) {
    module.exports = globalObject.AAA
  }
}

module.exports = [
  async (log = console.error.bind(console)) => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is scuttled to work',
      context: { AAA: '111' },
      defineOne: one,
      expectedResult: '111',
      opts: {
        scuttleGlobalThis: {
          enabled: true,
          exceptions: [
            'WebAssembly',
            'process',
            'console',
            'Math',
            'Date',
            'AAA',
          ],
        },
      },
    })
    await autoConfigForScenario({ scenario, log })
    return scenario
  },
  async (log = console.error.bind(console)) => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is too scuttled to work',
      context: { AAA: '111' },
      defineOne: one,
      opts: {
        scuttleGlobalThis: {
          enabled: true,
          exceptions: [
            'WebAssembly',
            'process',
            'console',
            'Math',
            'Date',
            // 'AAA',
          ],
        },
      },
      expectedFailure: true,
      expectedFailureMessageRegex:
        /SES_UNHANDLED_REJECTION|inaccessible under scuttling mode./,
    })
    await autoConfigForScenario({ scenario, log })
    return scenario
  },
]
