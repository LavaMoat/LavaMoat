const autogen = require('./autogen')

module.exports = { loadScenarios }
const scenarios = [...autogen]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
