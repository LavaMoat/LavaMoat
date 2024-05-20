// @ts-check

/**
 * Utilities for generating the endowments object based on a `globalRef` and a
 * {@link LMPolicy.PackagePolicy}.
 *
 * The contents of this file will be copied into the prelude template this
 * module has been written so that it required directly or copied and added to
 * the template with a small wrapper.
 *
 * The `PackagePolicy` uses a period-deliminated path notation to pull out deep
 * values from objects. These utilities help create an object populated with
 * only the deep properties specified in the `PackagePolicy`.
 *
 * @packageDocumentation
 */

module.exports = endowmentsToolkit

// module.exports.endowmentsToolkit = endowmentsToolkit

function endowmentsToolkit({
  createFunctionWrapper = defaultCreateFunctionWrapper,
} = {}) {
  return {
    // public API
    getEndowmentsForConfig,
    copyWrappedGlobals,
    getBuiltinForConfig,
    createFunctionWrapper,
    // internals exposed for core
    // TODO: hide eventually?
    makeMinimalViewOfRef,
    copyValueAtPath,
    applyGetSetPropDescTransforms,
    applyEndowmentPropDescTransforms,
  }

  /**
   * @template {object} T deep properties specified in the packagePolicy
   * @param {T} sourceRef - Object from which to copy properties
   * @param {LMPolicy.PackagePolicy} packagePolicy - LavaMoat policy item
   *   representing a package
   * @param {object} unwrapTo - For getters and setters, when the this-value is
   *   unwrapFrom, is replaced as unwrapTo
   * @param {object} unwrapFrom - For getters and setters, the this-value to
   *   replace (default: targetRef)
   * @returns {Partial<T>} - The targetRef
   */
  function getEndowmentsForConfig(
    sourceRef,
    packagePolicy,
    unwrapTo,
    unwrapFrom
  ) {
    if (!packagePolicy.globals) {
      return {}
    }
    // validate read access from packagePolicy
    /** @type {string[]} */
    const whitelistedReads = []
    /** @type {string[]} */
    const explicitlyBanned = []
    Object.entries(packagePolicy.globals).forEach(
      ([path, packagePolicyValue]) => {
        const pathParts = path.split('.')
        // disallow dunder proto in path
        const pathContainsDunderProto = pathParts.some(
          (pathPart) => pathPart === '__proto__'
        )
        if (pathContainsDunderProto) {
          throw new Error(
            `Lavamoat - "__proto__" disallowed when creating minimal view. saw "${path}"`
          )
        }
        // false means no access. It's necessary so that overrides can also be used to tighten the policy
        if (packagePolicyValue === false) {
          explicitlyBanned.push(path)
          return
        }
        // write access handled elsewhere
        if (packagePolicyValue === 'write') {
          return
        }
        if (packagePolicyValue !== true) {
          throw new Error(
            `LavaMoat - unrecognizable policy value (${typeof packagePolicyValue}) for path "${path}"`
          )
        }
        whitelistedReads.push(path)
      }
    )
    return makeMinimalViewOfRef(
      sourceRef,
      whitelistedReads,
      unwrapTo,
      unwrapFrom,
      explicitlyBanned
    )
  }

  /**
   * @template {object} T
   * @param {T} sourceRef
   * @param {string[]} paths
   * @param {object} [unwrapTo]
   * @param {object} [unwrapFrom]
   * @param {string[]} [explicitlyBanned]
   * @returns {Partial<T>}
   */
  function makeMinimalViewOfRef(
    sourceRef,
    paths,
    unwrapTo,
    unwrapFrom,
    explicitlyBanned = []
  ) {
    /** @type {object} */
    const targetRef = {}
    paths.forEach((path) => {
      copyValueAtPath(
        '',
        path.split('.'),
        explicitlyBanned,
        sourceRef,
        targetRef,
        unwrapTo,
        unwrapFrom
      )
    })
    return targetRef
  }

  /**
   * @template {object} T
   * @param {T} moduleNamespace
   * @param {string} moduleId
   * @param {LMPolicy.BuiltinPolicy} policyBuiltin
   * @returns {Partial<T>}
   */
  function getBuiltinForConfig(moduleNamespace, moduleId, policyBuiltin) {
    /** @type {string[]} */
    const builtinPaths = []

    /** @type {string[]} */
    const explicitlyBanned = []

    // Collect the same paths information as getEndowmentsForConfig to enable
    // matching behavior of policy between globals and builtins
    Object.entries(policyBuiltin).forEach(([packagePath, allowed]) => {
      const packagePathParts = packagePath.split('.')
      if (moduleId === packagePathParts[0]) {
        const packagePathWithoutPackage = packagePathParts.slice(1).join('.')
        if (allowed === true) {
          builtinPaths.push(packagePathWithoutPackage)
        } else if (allowed === false) {
          explicitlyBanned.push(packagePathWithoutPackage)
        }
      }
    })
    const moduleNamespaceView = makeMinimalViewOfRef(
      moduleNamespace,
      builtinPaths.sort(),
      undefined,
      undefined,
      explicitlyBanned
    )
    return moduleNamespaceView
  }

  /**
   * @param {string} visited
   * @param {string} next
   */
  function extendPath(visited, next) {
    // FIXME: second part of this conditional should be unnecessary
    if (!visited || visited.length === 0) {
      return next
    }
    return `${visited}.${next}`
  }

  /**
   * @template T
   * @param {T | null} value
   * @returns {value is null}
   */
  function isEmpty(value) {
    return !value
  }

  /**
   * @type {CopyValueAtPath}
   */
  function copyValueAtPath(
    visitedPath,
    pathParts,
    explicitlyBanned,
    sourceRef,
    targetRef,
    unwrapTo = sourceRef,
    unwrapFrom = targetRef
  ) {
    if (pathParts.length === 0) {
      throw new Error('unable to copy, must have pathParts, was empty')
    }
    const [nextPart, ...remainingParts] = pathParts
    const currentPath = extendPath(visitedPath, nextPart)
    // get the property from any depth in the property chain
    const { prop: sourcePropDesc } = getPropertyDescriptorDeep(
      sourceRef,
      nextPart
    )

    // if source missing the value to copy, just skip it
    if (isEmpty(sourcePropDesc)) {
      return
    }

    // if target already has a value, it must be extensible
    const targetPropDesc = Reflect.getOwnPropertyDescriptor(targetRef, nextPart)
    if (targetPropDesc) {
      // dont attempt to extend a getter or trigger a setter
      if (!('value' in targetPropDesc)) {
        throw new Error(
          `unable to copy on to targetRef, targetRef has a getter at "${nextPart}"`
        )
      }
      // value must be extensible (cant write properties onto it)
      const targetValue = targetPropDesc.value
      const valueType = typeof targetValue
      if (valueType !== 'object' && valueType !== 'function') {
        throw new Error(
          `unable to copy on to targetRef, targetRef value is not an obj or func "${nextPart}"`
        )
      }
    }

    // if this is not the last path in the assignment, walk into the containing reference
    if (remainingParts.length > 0) {
      const { sourceValue, sourceWritable } = getSourceValue(sourcePropDesc)
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
        nextTargetRef
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
        unwrapTo
      )
      Reflect.defineProperty(targetRef, nextPart, wrapperPropDesc)
      return
    }

    // need to determine the value type in order to copy it with
    // this-value unwrapping support
    const { sourceValue, sourceWritable } = getSourceValue(sourcePropDesc)

    // not a function - copy as is
    if (typeof sourceValue !== 'function') {
      Reflect.defineProperty(targetRef, nextPart, sourcePropDesc)
      return
    }
    // otherwise add workaround for functions to swap back to the sourceal "this" reference
    /**
     * @template T
     * @param {T} thisValue
     * @returns {thisValue is typeof unwrapFrom}
     */
    const unwrapTest = (thisValue) => thisValue === unwrapFrom
    const newValue = createFunctionWrapper(sourceValue, unwrapTest, unwrapTo)
    const newPropDesc = {
      value: newValue,
      writable: sourceWritable,
      enumerable: sourcePropDesc.enumerable,
      configurable: sourcePropDesc.configurable,
    }
    Reflect.defineProperty(targetRef, nextPart, newPropDesc)

    /**
     * @param {TypedPropertyDescriptor<any>} sourcePropDesc
     * @returns {{ sourceValue: any; sourceWritable: boolean | undefined }}
     */
    function getSourceValue(sourcePropDesc) {
      // determine the source value, this coerces getters to values
      // im deeply sorry, respecting getters was complicated and
      // my brain is not very good
      let sourceValue, sourceWritable
      if ('value' in sourcePropDesc) {
        sourceValue = sourcePropDesc.value
        sourceWritable = sourcePropDesc.writable
      } else if ('get' in sourcePropDesc && sourcePropDesc.get) {
        sourceValue = sourcePropDesc.get.call(unwrapTo)
        sourceWritable = 'set' in sourcePropDesc
      } else {
        throw new Error(
          'getEndowmentsForConfig - property descriptor missing a getter'
        )
      }
      return { sourceValue, sourceWritable }
    }
  }

  /**
   * @type {ApplyEndowmentPropDescTransforms}
   */
  function applyEndowmentPropDescTransforms(
    propDesc,
    unwrapFromCompartmentGlobalThis,
    unwrapToGlobalThis
  ) {
    let newPropDesc = propDesc
    newPropDesc = applyFunctionPropDescTransform(
      newPropDesc,
      unwrapFromCompartmentGlobalThis,
      unwrapToGlobalThis
    )
    newPropDesc = applyGetSetPropDescTransforms(
      newPropDesc,
      unwrapFromCompartmentGlobalThis,
      unwrapToGlobalThis
    )
    return newPropDesc
  }

  /**
   * @type {ApplyGetSetPropDescTransforms}
   */
  function applyGetSetPropDescTransforms(
    sourcePropDesc,
    unwrapFromGlobalThis,
    unwrapToGlobalThis
  ) {
    const wrappedPropDesc = { ...sourcePropDesc }
    if (sourcePropDesc.get) {
      wrappedPropDesc.get = function () {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const receiver = this
        // replace the "receiver" value if it points to fake parent
        const receiverRef =
          receiver === unwrapFromGlobalThis ? unwrapToGlobalThis : receiver
        // sometimes getters replace themselves with static properties, as seen wih the FireFox runtime
        const result = Reflect.apply(
          /** @type {NonNullable<typeof sourcePropDesc.get>} */ (
            sourcePropDesc.get
          ),
          receiverRef,
          []
        )
        if (typeof result === 'function') {
          // functions must be wrapped to ensure a good this-value.
          // lockdown causes some propDescs to go to value -> getter,
          // eg "Function.prototype.bind". we need to wrap getter results
          // as well in order to ensure they have their this-value wrapped correctly
          // if this ends up being problematic we can maybe take advantage of lockdown's
          // "getter.originalValue" property being available
          return createFunctionWrapper(
            result,
            /**
             * @param {any} thisValue
             * @returns {thisValue is typeof unwrapFromGlobalThis}
             */
            (thisValue) => thisValue === unwrapFromGlobalThis,
            unwrapToGlobalThis
          )
        } else {
          return result
        }
      }
    }
    if (sourcePropDesc.set) {
      wrappedPropDesc.set = function (value) {
        // replace the "receiver" value if it points to fake parent
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const receiver = this
        const receiverRef =
          receiver === unwrapFromGlobalThis ? unwrapToGlobalThis : receiver
        return Reflect.apply(
          /** @type {(v: any) => void} */ (sourcePropDesc.set),
          receiverRef,
          [value]
        )
      }
    }
    return wrappedPropDesc
  }

  /**
   * @param {PropertyDescriptor} propDesc
   * @param {object} unwrapFromCompartmentGlobalThis
   * @param {object} unwrapToGlobalThis
   * @returns {PropertyDescriptor}
   */
  function applyFunctionPropDescTransform(
    propDesc,
    unwrapFromCompartmentGlobalThis,
    unwrapToGlobalThis
  ) {
    if (!('value' in propDesc && typeof propDesc.value === 'function')) {
      return propDesc
    }
    /**
     * @param {any} thisValue
     * @returns {thisValue is typeof unwrapFromCompartmentGlobalThis}
     */
    const unwrapTest = (thisValue) => {
      // unwrap function calls this-value to unwrapToGlobalThis when:
      // this value is globalThis ex. globalThis.abc()
      // scope proxy leak workaround ex. abc()
      return thisValue === unwrapFromCompartmentGlobalThis
    }
    const newFn = createFunctionWrapper(
      propDesc.value,
      unwrapTest,
      unwrapToGlobalThis
    )
    return { ...propDesc, value: newFn }
  }

  /**
   * @param {object | null} target
   * @param {PropertyKey} key
   * @returns {{ prop: PropertyDescriptor | null; receiver: object | null }}
   */
  function getPropertyDescriptorDeep(target, key) {
    /** @type {object | null} */
    let receiver = target
    // eslint-disable-next-line no-constant-condition
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
        receiver = /** @type {any} */ (receiver).__proto__
      }
    }
  }

  /**
   * @type {CopyWrappedGlobals}
   */
  function copyWrappedGlobals(
    globalRef,
    target,
    globalThisRefs = ['globalThis']
  ) {
    // find the relevant endowment sources
    const globalProtoChain = getPrototypeChain(globalRef)
    // the index for the common prototypal ancestor, Object.prototype
    // this should always be the last index, but we check just in case
    const commonPrototypeIndex = globalProtoChain.findIndex(
      (globalProtoChainEntry) => globalProtoChainEntry === Object.prototype
    )
    if (commonPrototypeIndex === -1) {
      // TODO: fix this error message
      throw new Error(
        'Lavamoat - unable to find common prototype between Compartment and globalRef'
      )
    }
    // we will copy endowments from all entries in the prototype chain, excluding Object.prototype
    const endowmentSources = globalProtoChain.slice(0, commonPrototypeIndex)

    // call all getters, in case of behavior change (such as with FireFox lazy getters)
    // call on contents of endowmentsSources directly instead of in new array instances. If there is a lazy getter it only changes the original prop desc.
    endowmentSources.forEach((source) => {
      const descriptors = Object.getOwnPropertyDescriptors(source)
      Object.values(descriptors).forEach((desc) => {
        if ('get' in desc && desc.get) {
          try {
            // calling getters can potentially throw (e.g. localStorage inside a sandboxed iframe)
            Reflect.apply(desc.get, globalRef, [])
          } catch {}
        }
      })
    })

    const endowmentSourceDescriptors = endowmentSources.map(
      (globalProtoChainEntry) =>
        Object.getOwnPropertyDescriptors(globalProtoChainEntry)
    )
    // flatten propDesc collections with precedence for globalThis-end of the prototype chain
    const endowmentDescriptorsFlat = Object.assign(
      Object.create(null),
      ...endowmentSourceDescriptors.reverse()
    )
    // expose all own properties of globalRef, including non-enumerable
    Object.entries(endowmentDescriptorsFlat)
      // ignore properties already defined on compartment global
      .filter(([key]) => !(key in target))
      // ignore circular globalThis refs
      .filter(([key]) => !globalThisRefs.includes(key))
      // define property on compartment global
      .forEach(([key, desc]) => {
        // unwrap functions, setters/getters & apply scope proxy workaround
        const wrappedPropDesc = applyEndowmentPropDescTransforms(
          desc,
          target,
          globalRef
        )
        Reflect.defineProperty(target, key, wrappedPropDesc)
      })
    // global circular references otherwise added by prepareCompartmentGlobalFromConfig
    // Add all circular refs to root package compartment globalThis
    for (const ref of globalThisRefs) {
      if (ref in target) {
        continue
      }
      target[ref] = target
    }
    return target
  }

  /**
   * Util for getting the prototype chain as an array includes the provided
   * value in the result
   *
   * @param {any} value
   * @returns {any[]}
   */
  function getPrototypeChain(value) {
    const protoChain = []
    let current = value
    while (
      current &&
      (typeof current === 'object' || typeof current === 'function')
    ) {
      protoChain.push(current)
      current = Reflect.getPrototypeOf(current)
    }
    return protoChain
  }
}

/**
 * @type {DefaultWrapperFn}
 */
function defaultCreateFunctionWrapper(sourceValue, unwrapTest, unwrapTo) {
  /**
   * @param {...any[]} args
   * @returns {any}
   * @this {object}
   */
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
    Object.getOwnPropertyDescriptors(sourceValue)
  )
  return newValue
}

/**
 * @callback DefaultWrapperFn
 * @param {(...args: any[]) => any} sourceValue
 * @param {(value: any) => boolean} unwrapTest
 * @param {object} unwrapTo
 * @returns {(...args: any[]) => any}
 */

/**
 * @callback CopyWrappedGlobals
 * @param {object} globalRef
 * @param {Record<PropertyKey, any>} target
 * @param {string[]} globalThisRefs
 * @returns {Record<PropertyKey, any>}
 */

/**
 * @callback CopyValueAtPath
 * @param {string} visitedPath
 * @param {string[]} pathParts
 * @param {string[]} explicitlyBanned
 * @param {object} sourceRef
 * @param {object} targetRef
 * @param {object} [unwrapTo]
 * @param {object} [unwrapFrom]
 * @returns {void}
 */

/**
 * @callback ApplyGetSetPropDescTransforms
 * @param {PropertyDescriptor} sourcePropDesc
 * @param {object} unwrapFromGlobalThis
 * @param {object} unwrapToGlobalThis
 * @returns {PropertyDescriptor}
 */

/**
 * @callback ApplyEndowmentPropDescTransforms
 * @param {PropertyDescriptor} propDesc
 * @param {object} unwrapFromCompartmentGlobalThis
 * @param {object} unwrapToGlobalThis
 * @returns {PropertyDescriptor}
 */

// /**
//  * @typedef {object} EndowmentsToolkit
//  * @property {GetEndowmentsForConfig} getEndowmentsForConfig - Creates an object
//  *   populated with only the deep properties specified in the packagePolicy.
//  * @property {CopyWrappedGlobals} copyWrappedGlobals - Copies wrapped globals
//  *   from `globalRef` to `target`.
//  * @property {GetBuiltinForConfig} getBuiltinForConfig - Attenuates a builtin
//  *   using the same logic as globals attenuation.
//  * @property {DefaultWrapperFn} createFunctionWrapper - The
//  *   `createFunctionWrapper` function passed in the options or
//  *   `defaultCreateFunctionWrapper`.
//  * @property {MakeMinimalViewOfRef} makeMinimalViewOfRef - Creates a minimal
//  *   view of `sourceRef` with only the specified `paths`.
//  * @property {CopyValueAtPath} copyValueAtPath - Copies a value at a specific
//  *   path from `sourceRef` to `targetRef`.
//  * @property {ApplyGetSetPropDescTransforms} applyGetSetPropDescTransforms -
//  *   Applies transformations to getter/setter property descriptors.
//  * @property {ApplyEndowmentPropDescTransforms} applyEndowmentPropDescTransforms
//  *   - Applies transformations to endowment property descriptors.
//  */

// /**
//  * @callback EndowmentsToolkitFactory Creates an object with utility functions
//  *   for generating the endowments object based on a `globalRef` and a
//  *   `PackagePolicy`.
//  * @param {object} [opts] - Options for creating the endowments toolkit.
//  * @param {DefaultWrapperFn} [opts.createFunctionWrapper] - Custom function for
//  *   wrapping functions. Defaults to `defaultCreateFunctionWrapper`.
//  * @returns {EndowmentsToolkit} An object containing utility functions for
//  *   generating endowments.
//  */
