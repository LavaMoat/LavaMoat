const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is too scuttled to work',
      defineOne: () => {
        module.exports = 1
      },
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', /*'console', 'Array', 'RegExp', 'Date'*/],
      expectedFailure: true,
      expectedFailureMessageRegex: /Error: LavaMoat - property "console" of globalThis is inaccessible under scuttling mode/,
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is scuttled to work',
      defineOne: () => {
        module.exports = 1
      },
      expectedResult: 1,
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', 'console', 'Array', 'RegExp', 'Date'],
    })
    await autoConfigForScenario({ scenario })
    return scenario
  }
]
