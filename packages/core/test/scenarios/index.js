const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')
const config = require('./config')

module.exports = { loadScenarios }
const scenarios = [...autogen, ...security, ...basic, ...config]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
