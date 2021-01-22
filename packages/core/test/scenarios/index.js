const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')
const config = require('./config')
const endowments = require('./endowments')
const exportsDefense = require('./exportsDefense')
const generateConfig = require('./generateConfig')

module.exports = { loadScenarios }
const scenarios = [...autogen, ...security, ...basic, ...config, ...endowments, ...exportsDefense, ...generateConfig]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
