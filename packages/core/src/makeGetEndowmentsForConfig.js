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
    copyValueAtPath,
    createWrappedPropDesc,
    applyScopeProxyLeakWorkaround
  }

  /**
   *
   * @function getEndowmentsForConfig
   * @param {object} sourceRef - Object from which to copy properties
   * @param {object} config - LavaMoat package config
   * @param {object} unwrapTo - For getters and setters, when the this-value is unwrapFrom, is replaced as unwrapTo
   * @param {object} unwrapFrom - For getters and setters, the this-value to replace (default: targetRef)
   * @return {object} - The targetRef
   *
   */
  function getEndowmentsForConfig (sourceRef, config, unwrapTo, unwrapFrom) {
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
    return makeMinimalViewOfRef(sourceRef, whitelistedReads, unwrapTo, unwrapFrom)
  }

  function makeMinimalViewOfRef (sourceRef, paths, unwrapTo, unwrapFrom) {
    const targetRef = {}
    paths.forEach(path => {
      copyValueAtPath(path.split('.'), sourceRef, targetRef, unwrapTo, unwrapFrom)
    })
    return targetRef
  }

  function copyValueAtPath (pathParts, sourceRef, targetRef, unwrapTo = sourceRef, unwrapFrom = targetRef) {
    if (pathParts.length === 0) {
      throw new Error('unable to copy, must have pathParts, was empty')
    }
    const nextPart = pathParts[0]
    const remainingParts = pathParts.slice(1)
    // get the property from any depth in the property chain
    const { prop: sourcePropDesc } = getPropertyDescriptorDeep(sourceRef, nextPart)

    // if source missing the value to copy, just skip it
    if (!sourcePropDesc) {
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
      const { sourceValue, sourceWritable } = getSourceValue()
      const nextSourceRef = sourceValue
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
          writable: sourceWritable,
          enumerable: sourcePropDesc.enumerable,
          configurable: sourcePropDesc.configurable
        }
        Reflect.defineProperty(targetRef, nextPart, newPropDesc)
        // the newly created container will be the next target
        nextTargetRef = containerRef
      }
      copyValueAtPath(remainingParts, nextSourceRef, nextTargetRef)
      return
    }

    // this is the last part of the path, the value we're trying to actually copy
    // if has getter/setter - apply this-value unwrapping
    if (!('value' in sourcePropDesc)) {
      // wrapper setter/getter with correct receiver
      const wrapperPropDesc = createWrappedPropDesc(sourcePropDesc, unwrapFrom, unwrapTo)
      Reflect.defineProperty(targetRef, nextPart, wrapperPropDesc)
      return
    }

    // need to determine the value type in order to copy it with
    // this-value unwrapping support
    const { sourceValue, sourceWritable } = getSourceValue()

    // not a function - copy as is
    if (typeof sourceValue !== 'function') {
      Reflect.defineProperty(targetRef, nextPart, sourcePropDesc)
      return
    }
    // otherwise add workaround for functions to swap back to the sourceal "this" reference
    const newValue = createFunctionWrapper(sourceValue, unwrapFrom, unwrapTo)
    const newPropDesc = {
      value: newValue,
      writable: sourceWritable,
      enumerable: sourcePropDesc.enumerable,
      configurable: sourcePropDesc.configurable
    }
    Reflect.defineProperty(targetRef, nextPart, newPropDesc)

    function getSourceValue () {
      // determine the source value, this coerces getters to values
      // im deeply sorry, respecting getters was complicated and
      // my brain is not very good
      let sourceValue, sourceWritable
      if ('value' in sourcePropDesc) {
        sourceValue = sourcePropDesc.value
        sourceWritable = sourcePropDesc.writable
      } else if ('get' in sourcePropDesc) {
        sourceValue = sourcePropDesc.get.call(unwrapTo)
        sourceWritable = 'set' in sourcePropDesc
      } else {
        throw new Error('getEndowmentsForConfig - property descriptor missing a getter')
      }
      return { sourceValue, sourceWritable }
    }
  }

  function createWrappedPropDesc(sourcePropDesc, unwrapFrom, unwrapTo) {
    const wrappedPropDesc = {...sourcePropDesc}
    if (sourcePropDesc.get) {
      wrappedPropDesc.get = function () {
        const receiver = this
        // replace the "receiver" value if it points to fake parent
        const receiverRef = receiver === unwrapFrom ? unwrapTo : receiver
        return Reflect.apply(sourcePropDesc.get, receiverRef, [])
      }
    }
    if (sourcePropDesc.set) {
      wrappedPropDesc.set = function (value) {
        // replace the "receiver" value if it points to fake parent
        const receiver = this
        const receiverRef = receiver === unwrapFrom ? unwrapTo : receiver
        return Reflect.apply(sourcePropDesc.set, receiverRef, [value])
      }
    }
    return wrappedPropDesc
  }

  function applyScopeProxyLeakWorkaround (endowments, unwrapFrom, unwrapTo) {
    Object.entries(Object.getOwnPropertyDescriptors(endowments))
    .filter(([key, propDesc]) => 'value' in propDesc && typeof propDesc.value === 'function' && propDesc.configurable)
    .forEach(([key, propDesc]) => {
      const newFn = createFunctionWrapper(propDesc.value, unwrapFrom, unwrapTo)
      const newPropDesc = { ...propDesc, value: newFn }
      Reflect.defineProperty(endowments, key, newPropDesc)
    })
  }

  function createFunctionWrapper(sourceValue, unwrapFrom, unwrapTo) {
    const newValue = function (...args) {
      if (new.target) {
        // handle constructor calls
        return Reflect.construct(sourceValue, args, new.target)
      } else {
        // handle function calls
        // replace the "this" value if it points to fake parent
        const thisRef = this === unwrapFrom ? unwrapTo : this
        return Reflect.apply(sourceValue, thisRef, args)
      }
    }
    Object.defineProperties(newValue, Object.getOwnPropertyDescriptors(sourceValue))
    return newValue
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
