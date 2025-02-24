const chunkImporter = require('dynamic-importer/forcechunk')

chunkImporter.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})
