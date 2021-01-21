const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')
const config = require('./config')
const endowments = require('./endowments')
const exportsDefense = require('./exportsDefense')

module.exports = { loadScenarios }
const scenarios = [...exportsDefense]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
