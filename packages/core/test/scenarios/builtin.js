const { createScenarioFromScaffold } = require('../util.js')

module.exports = [
  async () => {
    const scenario = createScenarioFromScaffold({
      name: 'builtin - 3 levels of nesting in builtin policy',
      defineOne: () => {
        const os = require('node:os')
        module.exports = {
          errnoType: typeof os.constants.errno,
          hasSignals: 'signals' in os.constants,
          hasHostname: 'hostname' in os,
        }
      },
      builtin: {
        'node:os': require('node:os'),
      },
      config: {
        resources: {
          one: {
            builtin: {
              'node:os.constants.errno': true,
            },
          },
        },
      },
      expectedResult: {
        errnoType: 'object',
        hasSignals: false,
        hasHostname: false,
      },
    })
    return scenario
  },
]
