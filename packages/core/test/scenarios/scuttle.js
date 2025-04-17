const {
  createScenarioFromScaffold,
  autoConfigForScenario,
} = require('../util.js')

const one = () => {
  let globalObject = globalThis
  if (globalThis.getTrueGlobalThisForTestsOnly) {
    globalObject = globalThis.getTrueGlobalThisForTestsOnly()
  }
  // this will throw if regex scuttling fails
  if (globalObject.Float32Array) {
    module.exports = globalObject.Math.PI
  }
}

module.exports = [
  async (log = console.error.bind(console)) => {
    const scenario = createScenarioFromScaffold({
      name: 'scuttle - host env global object is scuttled to work',
      defineOne: one,
      expectedResult: Math.PI,
      opts: {
        scuttleGlobalThis: {
          enabled: true,
          exceptions: [
            'WebAssembly',
            'process',
            '/[0-9]+/',
            'Set',
            'Reflect',
            'Object',
            'console',
            'Array',
            'RegExp',
            'Date',
            'Math',
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
      defineOne: one,
      opts: {
        scuttleGlobalThis: {
          enabled: true,
          exceptions: [
            'WebAssembly',
            'process',
            '/[0-9]+/' /*'Set', 'Reflect', 'Object', 'console', 'Array', 'RegExp', 'Date', 'Math'*/,
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

// TODO when these aren't scuttled-exempt, endo-node and/or its testing infra breaks
const NEEDED_EXCEPTIONS = [
  "Object",
  "Function",
  "Array",
  "Number",
  "parseFloat",
  "Boolean",
  "String",
  "Symbol",
  "Error",
  "EvalError",
  "RangeError",
  "ReferenceError",
  "SyntaxError",
  "TypeError",
  "Date",
  "Promise",
  "JSON",
  "Math",
  "console",
  "Uint8Array",
  "Map",
  "WebAssembly",
  "isNaN",
  "process",
  "Set",
  "WeakMap",
  "URL",
  "assert",
  "Reflect",
  "WeakSet",
  "Proxy",
]
