const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')
const config = require('./config')
const endowments = require('./endowments')
const exportsDefense = require('./exportsDefense')
const globalWrites = require('./globalWrites')
const moduleExports = require('./moduleExports')
const transforms = require('./transforms')

module.exports = { loadScenarios }
const scenarios = [...autogen, ...security, ...basic, ...config, ...endowments, ...exportsDefense, ...globalWrites, ...moduleExports, ...transforms]

async function * loadScenarios () {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}
