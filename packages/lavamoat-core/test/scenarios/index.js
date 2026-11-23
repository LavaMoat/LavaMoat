const autogen = require('./autogen')
const security = require('./security')
const basic = require('./basic')
const builtin = require('./builtin')
const config = require('./config')
const endowments = require('./endowments')
const exportsDefense = require('./exportsDefense')
const policyEvasion = require('./policyEvasion')
const globalWrites = require('./globalWrites')
const moduleExports = require('./moduleExports')
const transforms = require('./transforms')
const globalRef = require('./globalRef')
const scuttle = require('./scuttle')

/**
 * @import {ScenarioFactory} from './scenario'
 */

/** @type {ScenarioFactory[]} */
const scenarios = [
  ...autogen,
  ...security,
  ...basic,
  ...builtin,
  ...config,
  ...endowments,
  ...exportsDefense,
  ...policyEvasion,
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
