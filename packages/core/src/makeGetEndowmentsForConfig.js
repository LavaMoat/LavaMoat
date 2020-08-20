// the contents of this file will be copied into the prelude template
// this module has been written so that it required directly or copied and added to the template with a small wrapper
module.exports = makeGetEndowmentsForConfig

// utilities for generating the endowments object based on a globalRef and a config

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help create an object populated with only the deep properties specified in the config

function makeGetEndowmentsForConfig () {
  return {
    getEndowmentsForConfig,
    getMinimalViewOfRef,
    deepGetAndBind,
    deepGet,
    deepDefine,
    makeMinimalViewOfRef,
    copyValueAtPath
  }

  // for backwards compat only
  function getEndowmentsForConfig (globalRef, config) {
    if (!config.globals) return {}
    return getMinimalViewOfRef(globalRef, config.globals)
  }

  function getMinimalViewOfRef (ref, config) {
    const newRef = {}
    Object.entries(config).forEach(([path, configValue]) => {
      const pathParts = path.split('.')
      // disallow dunder proto in path
      const pathContainsDunderProto = pathParts.some(pathPart => pathPart === '__proto__')
      if (pathContainsDunderProto) {
        throw new Error(`Lavamoat - "__proto__" disallowed when creating minial view. saw "${path}"`)
      }
      // write access handled elsewhere
      if (configValue === 'write') return
      if (configValue !== true) {
        throw new Error(`LavaMoat - unknown value for config (${typeof configValue})`)
      }
      const value = deepGetAndBind(ref, path, newRef)
      // TODO: actually match prop descriptor
      const propDesc = {
        value,
        configurable: true,
        writable: true,
        enumerable: true
      }
      deepDefine(newRef, path, propDesc)
    })
    return newRef
  }

  function deepGetAndBind (ref, pathName, fakeParent) {
    const pathParts = pathName.split('.')
    const parentPath = pathParts.slice(0, -1).join('.')
    const childKey = pathParts[pathParts.length - 1]
    const parent = parentPath ? deepGet(ref, parentPath) : ref
    if (!parent) return parent
    const value = parent[childKey]
    if (typeof value === 'function') {
      // pseudo-binding to parent, but allowing the this value to be overwritten
      const newValue = function () { return value.apply(this === fakeParent ? parent : this, arguments) }
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
    const lastPathPart = pathParts[pathParts.length - 1]
    const allButLastPart = pathParts.slice(0, -1)
    allButLastPart.forEach(pathPart => {
      const prevParent = parent
      parent = parent[pathPart]
      if (parent === null) {
        throw new Error('DeepSet - unable to set "' + pathName + '" on null')
      }
      if (parent === undefined) {
        parent = {}
        prevParent[pathPart] = parent
      }
    })
    Object.defineProperty(parent, lastPathPart, propDesc)
  }

  function makeMinimalViewOfRef (originRef, paths) {
    const newRef = {}
    paths.forEach(path => {
      copyValueAtPath(path.split('.'), originRef, newRef)
    })
    return newRef
  }

  function copyValueAtPath (pathParts, originRef, targetRef) {
    if (pathParts.length === 0) {
      throw new Error('unable to copy, must have pathParts, was empty')
    }
    const nextPart = pathParts[0]
    const remainingParts = pathParts.slice(1)
    // get the property from any depth in the property chain
    const { prop: originPropDesc, receiver: originReceiver } = getPropertyDescriptorDeep(originRef, nextPart)
    // origin missing the value to copy
    if (!originPropDesc) {
      // just skip it
      return
    }
    const originValue = originPropDesc.value
    // if target already has a value, it must be extensible
    const targetPropDesc = Reflect.getOwnPropertyDescriptor(targetRef, nextPart)
    if (targetPropDesc) {
      // dont attempt to extend a getter or trigger a setter
      if (!('value' in targetPropDesc)) {
        throw new Error(`unable to copy on to targetRef, targetRef has a getter at "${nextPart}"`)
      }
      // value must be extensible (cant write properties onto it)
      const targetValue = targetPropDesc.value
      const valueType = typeof targetValue
      if (valueType !== 'object' && valueType !== 'function') {
        throw new Error(`unable to copy on to targetRef, targetRef value is not an obj or func "${nextPart}"`)
      }
      // continue
      const nextOriginRef = originValue
      const nextTargetRef = targetValue
      copyValueAtPath(remainingParts, nextOriginRef, nextTargetRef)
      return
    }
    // its not populated so lets write to it
    // if this is not the last path in the assignment, put an object to serve as a container
    if (remainingParts.length > 0) {
      const newValue = {}
      const newPropDesc = {
        value: newValue,
        enumerable: originPropDesc.enumerable,
        writable: originPropDesc.writable,
        configutable: originPropDesc.configutable
      }
      Reflect.defineProperty(targetRef, nextPart, newPropDesc)
      // continue
      const nextOriginRef = originPropDesc.value
      const nextTargetRef = newValue
      copyValueAtPath(remainingParts, nextOriginRef, nextTargetRef)
      return
    }
    // this is the last part of the path, the value we're trying to actually copy
    // if has getter/setter - copy as is
    if (!('value' in originPropDesc)) {
      // wrapper setter/getter with correct receiver
      const get = originPropDesc.get && function () {
        const receiver = this
        // replace the "receiver" value if it points to fake parent
        const receiverRef = receiver === targetRef ? originRef : receiver
        return Reflect.get(originRef, nextPart, receiverRef)
      }
      const set = originPropDesc.set && function (value) {
        // replace the "receiver" value if it points to fake parent
        const receiver = this
        const receiverRef = receiver === targetRef ? originRef : receiver
        return Reflect.set(originRef, nextPart, value, receiverRef)
      }
      const wrapperPropDesc = { ...originPropDesc, get, set }
      Reflect.defineProperty(targetRef, nextPart, wrapperPropDesc)
      return
    }
    // not a function - copy as is
    if (typeof originValue !== 'function') {
      Reflect.defineProperty(targetRef, nextPart, originPropDesc)
      return
    }
    // otherwise add workaround for functions to swap back to the original "this" reference
    const newValue = function (...args) {
      if (new.target) {
        // handle constructor calls
        return Reflect.construct(originValue, args, new.target)
      } else {
        // handle function calls
        // replace the "this" value if it points to fake parent
        const thisRef = this === targetRef ? originRef : this
        return Reflect.apply(originValue, thisRef, args)
      }
    }
    Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(originValue))
    const newPropDesc = {
      value: newValue,
      enumerable: originPropDesc.enumerable,
      writable: originPropDesc.writable,
      configutable: originPropDesc.configutable
    }
    Reflect.defineProperty(targetRef, nextPart, newPropDesc)
  }
}

function getPropertyDescriptorDeep (target, key) {
  let receiver = target
  while (true) {
    const prop = Reflect.getOwnPropertyDescriptor(receiver, key)
    if (prop) {
      return { receiver, prop }
    }
    // try next in the prototype chain
    receiver = Reflect.getPrototypeOf(receiver)
    // abort if this is the end of the prototype chain.
    if (!receiver) return { prop: null, receiver: null }
  }
}