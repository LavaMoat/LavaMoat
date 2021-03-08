// the contents of this file will be copied into the prelude template
// this module has been written so that it required directly or copied and added to the template with a small wrapper
module.exports = makeGetEndowmentsForConfig

// utilities for generating the endowments object based on a globalRef and a config

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help create an object populated with only the deep properties specified in the config

function makeGetEndowmentsForConfig () {
  return {
    getEndowmentsForConfig,
    makeMinimalViewOfRef,
    copyValueAtPath
  }

  /**
   *
   * @function getEndowmentsForConfig
   * @param {object} sourceRef - Object from which to copy properties
   * @param {object} targetRef - Object to which to copy properties
   * @param {object} unwrapRef - For getters and setters, replaces targetRef as the 'this' value
   * @param {object} config - LavaMoat package config
   * @return {object} - The targetRef
   *
   */
  function getEndowmentsForConfig (sourceRef, unwrapRef, config) {
    if (!config.globals) return {}
    // validate read access from config
    const whitelistedReads = []
    Object.entries(config.globals).forEach(([path, configValue]) => {
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
      whitelistedReads.push(path)
    })
    return makeMinimalViewOfRef(sourceRef, unwrapRef, whitelistedReads)
  }

  function makeMinimalViewOfRef (originRef, unwrapRef, paths) {
    const targetRef = {}
    paths.forEach(path => {
      copyValueAtPath(path.split('.'), originRef, targetRef, unwrapRef)
    })
    return targetRef
  }

  function copyValueAtPath (pathParts, originRef, targetRef, unwrapRef) {
    if (pathParts.length === 0) {
      throw new Error('unable to copy, must have pathParts, was empty')
    }
    const nextPart = pathParts[0]
    const remainingParts = pathParts.slice(1)
    // get the property from any depth in the property chain
    const { prop: originPropDesc } = getPropertyDescriptorDeep(originRef, nextPart)

    // if origin missing the value to copy, just skip it
    if (!originPropDesc) {
      return
    }

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
    }

    // if this is not the last path in the assignment, walk into the containing reference
    if (remainingParts.length > 0) {
      const { originValue, originWritable } = getOriginValue()
      const nextOriginRef = originValue
      let nextTargetRef
      // check if value exists on target
      if (targetPropDesc) {
        // a value already exists, we should walk into it
        nextTargetRef = targetPropDesc.value
      } else {
        // its not populated so lets write to it
        // put an object to serve as a container
        const containerRef = {}
        const newPropDesc = {
          value: containerRef,
          writable: originWritable,
          enumerable: originPropDesc.enumerable,
          configurable: originPropDesc.configurable
        }
        Reflect.defineProperty(targetRef, nextPart, newPropDesc)
        // the newly created container will be the next target
        nextTargetRef = containerRef
      }
      copyValueAtPath(remainingParts, nextOriginRef, nextTargetRef, nextOriginRef)
      return
    }

    // this is the last part of the path, the value we're trying to actually copy
    // if has getter/setter - copy as is
    if (!('value' in originPropDesc)) {
      // wrapper setter/getter with correct receiver
      const get = originPropDesc.get && function () {
        const receiver = this
        // replace the "receiver" value if it points to fake parent
        const receiverRef = receiver === targetRef ? unwrapRef : receiver
        return Reflect.get(originRef, nextPart, receiverRef)
      }
      const set = originPropDesc.set && function (value) {
        // replace the "receiver" value if it points to fake parent
        const receiver = this
        const receiverRef = receiver === targetRef ? unwrapRef : receiver
        return Reflect.set(originRef, nextPart, value, receiverRef)
      }
      const wrapperPropDesc = { ...originPropDesc, get, set }
      Reflect.defineProperty(targetRef, nextPart, wrapperPropDesc)
      return
    }

    // need to determine the value type in order to copy it with
    // this-value unwrapping support
    const { originValue, originWritable } = getOriginValue()

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
        const thisRef = this === targetRef ? unwrapRef : this
        return Reflect.apply(originValue, thisRef, args)
      }
    }
    Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(originValue))
    const newPropDesc = {
      value: newValue,
      writable: originWritable,
      enumerable: originPropDesc.enumerable,
      configurable: originPropDesc.configurable
    }
    Reflect.defineProperty(targetRef, nextPart, newPropDesc)

    function getOriginValue () {
      // determine the origin value, this coerces getters to values
      // im deeply sorry, respecting getters was complicated and
      // my brain is not very good
      let originValue, originWritable
      if ('value' in originPropDesc) {
        originValue = originPropDesc.value
        originWritable = originPropDesc.writable
      } else if ('get' in originPropDesc) {
        originValue = originPropDesc.get.call(unwrapRef)
        originWritable = 'set' in originPropDesc
      } else {
        throw new Error('getEndowmentsForConfig - property descriptor missing a getter')
      }
      return { originValue, originWritable }
    }
  }
}

function getPropertyDescriptorDeep (target, key) {
  let receiver = target
  while (true) {
    // support lookup on objects and primitives
    const typeofReceiver = typeof receiver
    if (typeofReceiver === 'object' || typeofReceiver === 'function') {
      const prop = Reflect.getOwnPropertyDescriptor(receiver, key)
      if (prop) {
        return { receiver, prop }
      }
      // try next in the prototype chain
      receiver = Reflect.getPrototypeOf(receiver)
    } else {
      // prototype lookup for primitives
      // eslint-disable-next-line no-proto
      receiver = receiver.__proto__
    }
    // abort if this is the end of the prototype chain.
    if (!receiver) return { prop: null, receiver: null }
  }
}
