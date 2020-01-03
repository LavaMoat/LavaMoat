// the contents of this file will be copied into the prelude template
// this module has been written so that it required directly or copied and added to the template with a small wrapper
module.exports = makeGetEndowmentsForConfig

// utilities for generating the endowments object based on a globalRef and a config

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help create an object populated with only the deep properties specified in the config

function makeGetEndowmentsForConfig () {

  return {
    getEndowmentsForConfig,
    deepGetAndBind,
    deepGet,
    deepDefine,
  }

  function getEndowmentsForConfig (globalRef, config) {
    if (!config.globals) return {}
    const endowments = {}
    Object.entries(config.globals).forEach(([globalPath, configValue]) => {
      const pathParts = globalPath.split('.')
      // disallow dunder proto in path
      const pathContainsDunderProto = pathParts.some(pathPart => pathPart === '__proto__')
      if (pathContainsDunderProto) {
        throw new Error(`Lavamoat - "__proto__" disallowed in globals config paths. saw "${globalPath}"`)
      }
      // write access handled elsewhere
      if (configValue === 'write') return
      if (configValue !== true) {
        throw new Error('LavaMoat - unknown value for config globals')
      }
      const value = deepGetAndBind(globalRef, globalPath)
      if (value === undefined) return
      // TODO: actually match prop descriptor
      const propDesc = {
        value,
        configurable: true,
        writable: true,
        enumerable: true,
      }
      deepDefine(endowments, globalPath, propDesc)
    })
    return endowments
  }

  function deepGetAndBind(globalRef, pathName) {
    const pathParts = pathName.split('.')
    const parentPath = pathParts.slice(0,-1).join('.')
    const childKey = pathParts[pathParts.length-1]
    const parent = parentPath ? deepGet(globalRef, parentPath) : globalRef
    if (!parent) return parent
    const value = parent[childKey]
    if (typeof value === 'function') {
      // bind and copy
      const newValue = value.bind(parent)
      Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(value))
      return newValue
    } else {
      // return as is
      return value
    }
  }

  function deepGet (obj, pathName) {
    let result = obj
    pathName.split('.').forEach(pathPart => {
      if (result === null) {
        result = undefined
        return
      }
      if (result === undefined) {
        return
      }
      result = result[pathPart]
    })
    return result
  }

  function deepDefine (obj, pathName, propDesc) {
    let parent = obj
    const pathParts = pathName.split('.')
    const lastPathPart = pathParts[pathParts.length-1]
    const allButLastPart = pathParts.slice(0,-1)
    allButLastPart.forEach(pathPart => {
      const prevParent = parent
      parent = parent[pathPart]
      if (parent === null) {
        throw new Error('DeepSet - unable to set "'+pathName+'" on null')
      }
      if (parent === undefined) {
        parent = {}
        prevParent[pathPart] = parent
      }
    })
    Object.defineProperty(parent, lastPathPart, propDesc)
  }

}