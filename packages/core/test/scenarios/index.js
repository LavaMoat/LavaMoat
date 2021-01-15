const autogen = require('./autogen')
const security = require('./security')

module.exports = { loadScenarios }
const scenarios = [...autogen, ...security]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
