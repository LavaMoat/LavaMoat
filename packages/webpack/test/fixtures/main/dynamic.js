const dynamicImporter = require('dynamic-importer/dynamic')
const dynamicImporter2 = require('dynamic-importer2/dynamic')

dynamicImporter.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})
dynamicImporter2.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})
