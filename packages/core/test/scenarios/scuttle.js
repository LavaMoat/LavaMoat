const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

const one = () => {
  let globalObject = globalThis
  if (globalThis.getTrueGlobalThisForTestsOnly) {
    globalObject = globalThis.getTrueGlobalThisForTestsOnly()
  }
  module.exports = (globalObject.Float32Array , globalObject.Math.PI)
}

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is scuttled to work',
      defineOne: one,
      expectedResult: Math.PI,
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', '/[0-9]+/', 'Set', 'Reflect', 'Object', 'console', 'Array', 'RegExp', 'Date', 'Math'],
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is too scuttled to work',
      defineOne: one,
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', '/[0-9]+/', /*'Set', 'Reflect', 'Object', 'console', 'Array', 'RegExp', 'Date', 'Math'*/],
      expectedFailure: true,
      expectedFailureMessageRegex: /LavaMoat - property "[A-Za-z]*" of globalThis is inaccessible under scuttling mode/,
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
]
