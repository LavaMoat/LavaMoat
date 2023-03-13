const { createScenarioFromScaffold, autoConfigForScenario } = require('../util.js')

const one = () => {
  let globalObject = globalThis
  if (globalThis.getTrueGlobalThisForTestsOnly) {
    globalObject = globalThis.getTrueGlobalThisForTestsOnly()
  }
  // this will throw if regex scuttling fails
  if (globalObject.Float32Array) {
    // this will throw if Boolean.prototype.toString is scuttled
    if (console.info) {
      module.exports = globalObject.Math.PI
    }
  }
}

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is scuttled to work',
      defineOne: one,
      expectedResult: Math.PI,
      scuttleGlobalThis: true,
      scuttleGlobalThisExceptions: ['process', /[0-9]+/, 'Set', 'Reflect', 'Object', 'console', 'Array', 'RegExp', 'Date', 'Math'],
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env Boolean object is too scuttled to work',
      defineOne: one,
      scuttleGlobalThis: true,
      scuttleMore: {
        'console': ['info'],
      },
      scuttleGlobalThisExceptions: ['process', /[0-9]+/, 'Set', 'Reflect', 'Object', 'console', 'Array', 'RegExp', 'Date', 'Math'],
      expectedFailure: true,
      expectedFailureMessageRegex: /SES_UNHANDLED_REJECTION|inacce_______ssible under scuttling mode./,
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
      expectedFailureMessageRegex: /SES_UNHANDLED_REJECTION|inaccessible under scuttling mode./,
    })
    await autoConfigForScenario({ scenario })
    return scenario
  },
]
