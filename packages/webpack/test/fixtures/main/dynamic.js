const dynamicImporter = require('dynamic-importer')

dynamicImporter.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})
