const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')
const config = require('./config')
const endowments = require('./endowments')
const exportsDefense = require('./exportsDefense')
const globalWrites = require('./globalWrites')
const moduleExports = require('./moduleExports')
const transforms = require('./transforms')
const globalRef = require('./globalRef')
const scuttle = require('./scuttle')

/** @type {import('./scenario').ScenarioFactory[]} */
const scenarios = [
  ...autogen,
  ...security,
  ...basic,
  ...config,
  ...endowments,
  ...exportsDefense,
  ...globalWrites,
  ...moduleExports,
  ...transforms,
  ...globalRef,
  ...scuttle,
]

async function* loadScenarios() {
  for (const scenarioCreator of scenarios) {
    yield await scenarioCreator()
  }
}

module.exports = { loadScenarios }
