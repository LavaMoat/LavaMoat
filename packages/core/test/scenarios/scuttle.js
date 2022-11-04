const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

const one = () => {
  let result
  if (globalThis.getTrueGlobalThisForTestsOnly) {
    // browserify env
    result = globalThis.getTrueGlobalThisForTestsOnly().Math.SQRT2
  } else {
    // core/node env
    result = Math.SQRT2
  }
  module.exports = result
}

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is scuttled to work',
      defineOne: one,
      expectedResult: Math.SQRT2,
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', 'console', 'Array', 'RegExp', 'Date', 'Math'],
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is too scuttled to work',
      defineOne: one,
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', /*'console', 'Array', 'RegExp', 'Date', 'Math'*/],
      expectedFailure: true,
      expectedFailureMessageRegex: /LavaMoat - property "[A-Za-z]*" of globalThis is inaccessible under scuttling mode/,
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
]
