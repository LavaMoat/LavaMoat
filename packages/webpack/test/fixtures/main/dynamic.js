const dynamicImporter = require('dynamic-importer/dynamic')

dynamicImporter.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})
