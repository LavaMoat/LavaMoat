const { callbackify } = require('util')
const through = require('through2').obj

module.exports = { createCompartmentMapperStream }

function createCompartmentMapperStream ({ onCompartmentMap } = {}) {

  const compartmentMap = {
    tags: ['browser'],
    entry: {
      compartment: '',
      module: '',
    },
    compartments: {
      // 'xyz': {
      //   label: 'xyz',
      //   path: ['xyz'],
      //   name: 'xyz',
      //   location: 'xyz',
      //   modules: {},
      //   scopes: {},
      //   parsers: {},
      //   types: {},
      // }
    },
  }

  const moduleRegistry = {}

  const onModule = callbackify(async (moduleData) => {
    const compartmentDescriptor = getCompartment(moduleData.packageName)
    compartmentDescriptor.modules[moduleData.id] = {
      compartment: compartmentDescriptor.name,
      module: moduleData.id,
      location: moduleData.file,
      parser: 'cjs',
    }
    moduleRegistry[moduleData.id] = moduleData
    return moduleData
  })

  const onDone = callbackify(async () => {
    onCompartmentMap({ compartmentMap, moduleRegistry })
  })

  return through(onModule, onDone)

  function getCompartment (packageName) {
    let compartmentDescriptor = compartmentMap.compartments[packageName]
    if (compartmentDescriptor === undefined) {
      compartmentDescriptor = {
        label: packageName,
        path: [packageName],
        name: packageName,
        location: packageName,
        modules: {},
        scopes: {},
        parsers: {},
        types: {},
      }
      compartmentMap.compartments[packageName] = compartmentDescriptor
    }
    return compartmentDescriptor
  }
}
