const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')

module.exports = { loadScenarios }
const scenarios = [...autogen, ...security, ...basic]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
