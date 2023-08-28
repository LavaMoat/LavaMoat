// @ts-check
module.exports = {
  endowCompartmentWith,
  makeGetEndowmentsForConfig,
}

// looking at the size of this it aint bad for a bundled runtime and I wish to look for how we can do less in here.

// By comparison with kernelCoreTemplate - this will not work for the root compartment in LavaMoat,
// root compartment is special and needs to be custom-built
// A separate function needs to exist for building it to maintain compatibility. Some functions from here are going to be usagle in it.
// In Endo we could have a separate attenuator implementation for the root compartment to avoid finding the root by checking if it quacks

function endowCompartmentWith(
  compartmentGlobalThis,
  { globals, compartmentPolicy, wrapGlobalFunctionsTo = null },
) {
  const { getEndowmentsForConfig, applyEndowmentPropDescTransforms } =
    makeGetEndowmentsForConfig({
      createFunctionWrapper,
      // also the wrapGlobalFunctionsTo so that getting endowments can configure the function wrapper
    })

  // prepare endowments
  let endowments
  try {
    endowments = getEndowmentsForConfig(
      // source reference
      wrapGlobalFunctionsTo,
      // policy.resources[resourceId], but we don't depend on knowin resourceId here - both Endo and webpack plugin do things to get rid of the resourceId for production use
      compartmentPolicy,
      // unwrap to
      globals,
      // unwrap from
      compartmentGlobalThis,
    )
  } catch (err) {
    // TODO: crap, we don't have any of that info in attenuators. But I think attenuator errors are wrapped with more detail info.
    const errMsg = `Lavamoat - failed to prepare endowments for package "${packageName}":\n${err.stack}`
    throw new Error(errMsg)
  }

  // transform functions, getters & setters on prop descs. Solves SES scope proxy bug
  // TODO: do we need all of this, or now that quadruple backflip exists we only need it for
  Object.entries(Object.getOwnPropertyDescriptors(endowments))
    // ignore non-configurable properties because we are modifying endowments in place
    .filter(([_key, propDesc]) => propDesc.configurable)
    .forEach(([key, propDesc]) => {
      const wrappedPropDesc = applyEndowmentPropDescTransforms(
        propDesc,
        compartmentGlobalThis,
        wrapGlobalFunctionsTo,
      )
      Reflect.defineProperty(endowments, key, wrappedPropDesc)
    })

  // sets up read/write access as configured
  const globalsConfig = compartmentPolicy.globals
  // TODO: need a good idea where to get this from.
  prepareCompartmentGlobalFromConfig(
    compartmentGlobalThis,
    globalsConfig,
    endowments,
    globalStore,
    wrapGlobalFunctionsTo,
  )

  // pass all endowments with getOwnPropertyDescriptors and defineProperty onto the compartmentGlobalThis, including the part that handles writable fields etc.
}

// ===================================================================================

function prepareCompartmentGlobalFromConfig(
  compartmentGlobalThis,
  globalsConfig,
  endowments,
  globalStore,
  globalThisRefs,
) {
  // lookup top level read + write access keys
  const topLevelWriteAccessKeys =
    getTopLevelWriteAccessFromPackageConfig(globalsConfig)
  const topLevelReadAccessKeys =
    getTopLevelReadAccessFromPackageConfig(globalsConfig)

  // define accessors

  // allow read access via globalStore or compartmentGlobalThis
  topLevelReadAccessKeys.forEach((key) => {
    Object.defineProperty(compartmentGlobalThis, key, {
      get() {
        if (globalStore.has(key)) {
          return globalStore.get(key)
        } else {
          return Reflect.get(endowments, key, this)
        }
      },
      set() {
        // TODO: there should be a config to throw vs silently ignore
        console.warn(
          `LavaMoat: ignoring write attempt to read-access global "${key}"`,
        )
      },
    })
  })

  // allow write access to globalStore
  // read access via globalStore or compartmentGlobalThis
  topLevelWriteAccessKeys.forEach((key) => {
    Object.defineProperty(compartmentGlobalThis, key, {
      get() {
        if (globalStore.has(key)) {
          return globalStore.get(key)
        } else {
          return endowments[key]
        }
      },
      set(value) {
        globalStore.set(key, value)
      },
      enumerable: true,
      configurable: true,
    })
  })

  // set circular globalRefs
  globalThisRefs.forEach((key) => {
    // if globalRef is actually an endowment, ignore
    if (topLevelReadAccessKeys.includes(key)) {
      return
    }
    if (topLevelWriteAccessKeys.includes(key)) {
      return
    }
    // set circular ref to global
    compartmentGlobalThis[key] = compartmentGlobalThis
  })

  // bind Function constructor this value to globalThis
  // legacy globalThis shim
  const origFunction = compartmentGlobalThis.Function
  const newFunction = function (...args) {
    const fn = origFunction(...args)
    const unwrapTest = (thisValue) => thisValue === undefined
    return createFunctionWrapper(fn, unwrapTest, compartmentGlobalThis)
  }
  Object.defineProperties(
    newFunction,
    Object.getOwnPropertyDescriptors(origFunction),
  )
  compartmentGlobalThis.Function = newFunction
}

function getTopLevelReadAccessFromPackageConfig(globalsConfig) {
  const result = Object.entries(globalsConfig)
    // TODO: some of the assumptions encoded here are undocummented. I think we can definitely get rid of the 'read' value that's not documented nor used
    .filter(
      ([key, value]) =>
        value === 'read' ||
        value === true ||
        (value === 'write' && key.split('.').length > 1),
    )
    .map(([key]) => key.split('.')[0])
  // return unique array
  return Array.from(new Set(result))
}

function getTopLevelWriteAccessFromPackageConfig(globalsConfig) {
  const result = Object.entries(globalsConfig)
    .filter(([key, value]) => value === 'write' && key.split('.').length === 1)
    .map(([key]) => key)
  return result
}

// ===================================================================================
// function wrapping util

function createFunctionWrapper(sourceValue, unwrapTest, unwrapTo) {
  const newValue = function (...args) {
    if (new.target) {
      // handle constructor calls
      return Reflect.construct(sourceValue, args, new.target)
    } else {
      // handle function calls
      // unwrap to target value if this value is the source package compartment's globalThis
      const thisRef = unwrapTest(this) ? unwrapTo : this
      return Reflect.apply(sourceValue, thisRef, args)
    }
  }
  Object.defineProperties(
    newValue,
    Object.getOwnPropertyDescriptors(sourceValue),
  )
  return newValue
}

// ===================================================================================
// utilities for generating the endowments object based on a globalRef and a config

// The config uses a period-deliminated path notation to pull out deep values from objects
// These utilities help create an object populated with only the deep properties specified in the config

function makeGetEndowmentsForConfig({ createFunctionWrapper }) {
  return {
    getEndowmentsForConfig,
    makeMinimalViewOfRef,
    copyValueAtPath,
    applyGetSetPropDescTransforms,
    applyEndowmentPropDescTransforms,
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
  function getEndowmentsForConfig(sourceRef, config, unwrapTo, unwrapFrom) {
    if (!config.globals) {
      return {}
    }
    // validate read access from config
    const whitelistedReads = []
    const explicitlyBanned = []
    Object.entries(config.globals).forEach(([path, configValue]) => {
      const pathParts = path.split('.')
      // disallow dunder proto in path
      const pathContainsDunderProto = pathParts.some(
        (pathPart) => pathPart === '__proto__',
      )
      if (pathContainsDunderProto) {
        throw new Error(
          `Lavamoat - "__proto__" disallowed when creating minial view. saw "${path}"`,
        )
      }
      // false means no access. It's necessary so that overrides can also be used to tighten the policy
      if (configValue === false) {
        explicitlyBanned.push(path)
        return
      }
      // write access handled elsewhere
      if (configValue === 'write') {
        return
      }
      if (configValue !== true) {
        throw new Error(
          `LavaMoat - unrecognizable policy value (${typeof configValue}) for path "${path}"`,
        )
      }
      whitelistedReads.push(path)
    })
    return makeMinimalViewOfRef(
      sourceRef,
      whitelistedReads,
      unwrapTo,
      unwrapFrom,
      explicitlyBanned,
    )
  }

  function makeMinimalViewOfRef(
    sourceRef,
    paths,
    unwrapTo,
    unwrapFrom,
    explicitlyBanned = [],
  ) {
    const targetRef = {}
    paths.forEach((path) => {
      copyValueAtPath(
        '',
        path.split('.'),
        explicitlyBanned,
        sourceRef,
        targetRef,
        unwrapTo,
        unwrapFrom,
      )
    })
    return targetRef
  }

  function extendPath(visited, next) {
    if (!visited || visited.length === 0) {
      return next
    }
    return `${visited}.${next}`
  }

  function copyValueAtPath(
    visitedPath,
    pathParts,
    explicitlyBanned,
    sourceRef,
    targetRef,
    unwrapTo = sourceRef,
    unwrapFrom = targetRef,
  ) {
    if (pathParts.length === 0) {
      throw new Error('unable to copy, must have pathParts, was empty')
    }
    const [nextPart, ...remainingParts] = pathParts
    const currentPath = extendPath(visitedPath, nextPart)
    // get the property from any depth in the property chain
    const { prop: sourcePropDesc } = getPropertyDescriptorDeep(
      sourceRef,
      nextPart,
    )

    // if source missing the value to copy, just skip it
    if (!sourcePropDesc) {
      return
    }

    // if target already has a value, it must be extensible
    const targetPropDesc = Reflect.getOwnPropertyDescriptor(
      targetRef,
      nextPart,
    )
    if (targetPropDesc) {
      // dont attempt to extend a getter or trigger a setter
      if (!('value' in targetPropDesc)) {
        throw new Error(
          `unable to copy on to targetRef, targetRef has a getter at "${nextPart}"`,
        )
      }
      // value must be extensible (cant write properties onto it)
      const targetValue = targetPropDesc.value
      const valueType = typeof targetValue
      if (valueType !== 'object' && valueType !== 'function') {
        throw new Error(
          `unable to copy on to targetRef, targetRef value is not an obj or func "${nextPart}"`,
        )
      }
    }

    // if this is not the last path in the assignment, walk into the containing reference
    if (remainingParts.length > 0) {
      const { sourceValue, sourceWritable } = getSourceValue()
      const nextSourceRef = sourceValue
      let nextTargetRef
      // check if value exists on target and does not need selective treatment
      if (targetPropDesc && !explicitlyBanned.includes(currentPath)) {
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
          configurable: sourcePropDesc.configurable,
        }
        Reflect.defineProperty(targetRef, nextPart, newPropDesc)
        // the newly created container will be the next target
        nextTargetRef = containerRef
      }
      copyValueAtPath(
        currentPath,
        remainingParts,
        explicitlyBanned,
        nextSourceRef,
        nextTargetRef,
      )
      return
    }

    // If conflicting rules exist, opt for the negative one. This should never happen
    if (explicitlyBanned.includes(currentPath)) {
      console.warn(`LavaMoat - conflicting rules exist for "${currentPath}"`)
      return
    }

    // this is the last part of the path, the value we're trying to actually copy
    // if has getter/setter - apply this-value unwrapping
    if (!('value' in sourcePropDesc)) {
      // wrapper setter/getter with correct receiver
      const wrapperPropDesc = applyGetSetPropDescTransforms(
        sourcePropDesc,
        unwrapFrom,
        unwrapTo,
      )
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
    const unwrapTest = (thisValue) => thisValue === unwrapFrom
    const newValue = createFunctionWrapper(sourceValue, unwrapTest, unwrapTo)
    const newPropDesc = {
      value: newValue,
      writable: sourceWritable,
      enumerable: sourcePropDesc.enumerable,
      configurable: sourcePropDesc.configurable,
    }
    Reflect.defineProperty(targetRef, nextPart, newPropDesc)

    function getSourceValue() {
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
        throw new Error(
          'getEndowmentsForConfig - property descriptor missing a getter',
        )
      }
      return { sourceValue, sourceWritable }
    }
  }

  function applyEndowmentPropDescTransforms(
    propDesc,
    unwrapFromCompartmentGlobalThis,
    unwrapToGlobalThis,
  ) {
    let newPropDesc = propDesc
    newPropDesc = applyFunctionPropDescTransform(
      newPropDesc,
      unwrapFromCompartmentGlobalThis,
      unwrapToGlobalThis,
    )
    newPropDesc = applyGetSetPropDescTransforms(
      newPropDesc,
      unwrapFromCompartmentGlobalThis,
      unwrapToGlobalThis,
    )
    return newPropDesc
  }

  function applyGetSetPropDescTransforms(
    sourcePropDesc,
    unwrapFromGlobalThis,
    unwrapToGlobalThis,
  ) {
    const wrappedPropDesc = { ...sourcePropDesc }
    if (sourcePropDesc.get) {
      wrappedPropDesc.get = function () {
        const receiver = this
        // replace the "receiver" value if it points to fake parent
        const receiverRef =
          receiver === unwrapFromGlobalThis ? unwrapToGlobalThis : receiver
        // sometimes getters replace themselves with static properties, as seen wih the FireFox runtime
        const result = Reflect.apply(sourcePropDesc.get, receiverRef, [])
        if (typeof result === 'function') {
          // functions must be wrapped to ensure a good this-value.
          // lockdown causes some propDescs to go to value -> getter,
          // eg "Function.prototype.bind". we need to wrap getter results
          // as well in order to ensure they have their this-value wrapped correctly
          // if this ends up being problematic we can maybe take advantage of lockdown's
          // "getter.originalValue" property being available
          return createFunctionWrapper(
            result,
            (thisValue) => thisValue === unwrapFromGlobalThis,
            unwrapToGlobalThis,
          )
        } else {
          return result
        }
      }
    }
    if (sourcePropDesc.set) {
      wrappedPropDesc.set = function (value) {
        // replace the "receiver" value if it points to fake parent
        const receiver = this
        const receiverRef =
          receiver === unwrapFromGlobalThis ? unwrapToGlobalThis : receiver
        return Reflect.apply(sourcePropDesc.set, receiverRef, [value])
      }
    }
    return wrappedPropDesc
  }

  function applyFunctionPropDescTransform(
    propDesc,
    unwrapFromCompartmentGlobalThis,
    unwrapToGlobalThis,
  ) {
    if (!('value' in propDesc && typeof propDesc.value === 'function')) {
      return propDesc
    }
    const unwrapTest = (thisValue) => {
      // unwrap function calls this-value to unwrapToGlobalThis when:
      // this value is globalThis ex. globalThis.abc()
      // scope proxy leak workaround ex. abc()
      return thisValue === unwrapFromCompartmentGlobalThis
    }
    const newFn = createFunctionWrapper(
      propDesc.value,
      unwrapTest,
      unwrapToGlobalThis,
    )
    return { ...propDesc, value: newFn }
  }
}

function getPropertyDescriptorDeep(target, key) {
  let receiver = target
  while (true) {
    // abort if this is the end of the prototype chain.
    if (!receiver) {
      return { prop: null, receiver: null }
    }
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
  }
}
