const dynamicImporter = require('dynamic-importer/dynamic')
const empty = require('dynamic-importer/emptycontext')
const dynamicImporter2 = require('dynamic-importer2/dynamic')

dynamicImporter.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})
dynamicImporter2.loadDep().then((dynamicModule) => {
  dynamicModule.default()
})

empty.loadDep().then(
  (dynamicModule) => {
    throw Error('Expected empty context to not provide a module')
  },
  (err) => {
    if (err.message !== "Cannot find module 'unrecognizable1'") {
      throw err
    }
  }
)
