// @ts-check

const {
  getOptionsForBin,
  loadAllPackageConfigurations,
  setDefaultConfiguration,
} = require('./config.js')
const { areBinsBlocked, editPackageJson, writeRcFile } = require('./setup.js')
const { printPackagesList, printMissingPoliciesIfAny } = require('./report.js')
const runAllowedPackages = require('./runAllowedPackages.js')

module.exports = {
  getOptionsForBin,
  loadAllPackageConfigurations,
  printMissingPoliciesIfAny,
  printPackagesList,
  runAllowedPackages,
  setDefaultConfiguration,
  setup: {
    areBinsBlocked,
    editPackageJson,
    writeRcFile,
  },
}
