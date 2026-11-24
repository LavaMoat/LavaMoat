/**
 * Utilities for generating the endowments object based on a `globalRef` and a
 * {@link ResourcePolicy}.
 *
 * The `PackagePolicy` uses a period-delimited path notation to pull out deep
 * values from objects. These utilities help create an object populated with
 * only the deep properties specified in the `PackagePolicy`.
 *
 * @remarks
 * **This module is import-free by design.** It is used directly by the runtime
 * in webpack/browserify plugins which assemble modules via simple shimming. No
 * imports — not even `import type` that might be misread — should be added here
 * except for type-only erasable imports.
 * @packageDocumentation
 */

// Type-only imports are erased at compile time and produce no runtime imports.
import type { ContextTestFn, SomeFunction } from './internal.js'
import type {
  BuiltinPolicy,
  GlobalPolicyValue,
  ResourcePolicy,
} from '@lavamoat/types'

// List of global properties that have lazy getters and should be avoided when
// creating a copy of all globals. These tend to be lazy-loaded to avoid heavy
// work during initialization or may cause side effects if accessed prematurely.
const GLOBAL_LAZY_GETTERS_TO_AVOID_HITTING: readonly string[] = [
  'localStorage',
  'sessionStorage',
]

/**
 * The default implementation of the utility for wrapping endowed functions to
 * set `this` to a correct reference.
 *
 * Wraps a function so that it has a proper context object.
 *
 * The motivation is that some functions in `globalThis` must be called with the
 * `globalThis` object as context. This detects such functions and wraps them
 * such that they are called with the correct context.
 *
 * Supports constructors (e.g., {@link FunctionConstructor}).
 *
 * @template T Function to wrap. Can be a constructor.
 * @template U Context to use, if necessary.
 * @param sourceValue Function to wrap
 * @param unwrapTest Test to determine context; if true will use `unwrapTo` as
 *   `this`
 * @param unwrapTo Some object (usually a `globalThis`)
 * @returns Wrapped function
 */
export function defaultCreateFunctionWrapper<
  T extends SomeFunction = SomeFunction,
  U extends object = object,
>(sourceValue: T, unwrapTest: ContextTestFn, unwrapTo: U): T {
  const newValue = function (this: U | Record<PropertyKey, unknown>) {
    'use strict'
    if (new.target) {
      // handle constructor calls
      // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-unsafe-return
      return Reflect.construct(sourceValue, arguments, new.target)
    } else {
      // handle function calls
      // unwrap to target value if this value is the source package compartment's globalThis
      const thisRef = unwrapTest(this) ? unwrapTo : this
      return Reflect.apply(
        sourceValue as (...args: unknown[]) => unknown,
        thisRef,
        // eslint-disable-next-line prefer-rest-params
        arguments as unknown as unknown[]
      )
    }
  }
  Object.defineProperties(
    newValue,
    Object.getOwnPropertyDescriptors(sourceValue)
  )
  // Global functions can have static fields on a prototype. eg. Uint8Array.from
  if (
    Reflect.getPrototypeOf(newValue) !== Reflect.getPrototypeOf(sourceValue)
  ) {
    Object.setPrototypeOf(newValue, Reflect.getPrototypeOf(sourceValue))
  }
  return newValue as unknown as T
}

/**
 * Options for {@link endowmentsToolkit}.
 */
export interface EndowmentsToolkitOptions {
  /**
   * Function wrapper factory; defaults to {@link defaultCreateFunctionWrapper}.
   */
  createFunctionWrapper?: DefaultWrapperFn
  /**
   * Whether to handle write access for globals. Defaults to `false`.
   */
  handleGlobalWrite?: boolean
  /**
   * List of globals that can be mutated later.
   */
  knownWritableFields?: Set<string>
}

/**
 * Wraps a function so that it has a proper context object.
 *
 * @callback DefaultWrapperFn
 * @param sourceValue Function to wrap
 * @param unwrapTest Test to determine context
 * @param unwrapTo Object to use as `this` when test passes
 * @returns Wrapped function
 */
export type DefaultWrapperFn = (
  sourceValue: (...args: unknown[]) => unknown,
  unwrapTest: (value: unknown) => boolean,
  unwrapTo: object
) => (...args: unknown[]) => unknown

/**
 * Makes a copy of all globals from the global ref to a target and wraps them
 * with the wrapper this endowmentsToolkit was configured to use.
 *
 * @callback CopyWrappedGlobals
 * @param globalRef Source global object
 * @param target Target to copy properties to
 * @param globalThisRefs Names of circular globalThis references
 * @returns The populated target
 */
export type CopyWrappedGlobals = (
  globalRef: object,
  target: Record<PropertyKey, unknown>,
  globalThisRefs?: string[]
) => Record<PropertyKey, unknown>

/**
 * A recursive function to copy a single (nested) property located at the
 * provided path from a sourceRef to targetRef.
 *
 * @callback CopyValueAtPath
 */
export type CopyValueAtPath = (
  visitedPath: string,
  pathParts: string[],
  explicitlyBanned: string[],
  sourceRef: object,
  targetRef: object,
  unwrapTo?: object,
  unwrapFrom?: object
) => void

/**
 * Utility function used by copyWrappedGlobals to wrap a property with a getter
 * and/or setter.
 *
 * @callback ApplyGetSetPropDescTransforms
 */
export type ApplyGetSetPropDescTransforms = (
  sourcePropDesc: PropertyDescriptor,
  unwrapFromGlobalThis: object,
  unwrapToGlobalThis: object
) => PropertyDescriptor

/**
 * Utility function used by copyWrappedGlobals to choose a wrapping strategy.
 *
 * @callback ApplyEndowmentPropDescTransforms
 */
export type ApplyEndowmentPropDescTransforms = (
  propDesc: PropertyDescriptor,
  unwrapFromCompartmentGlobalThis: object,
  unwrapToGlobalThis: object
) => PropertyDescriptor

/**
 * The shape of the object returned by {@link endowmentsToolkit}.
 */
export interface EndowmentsToolkit {
  getEndowmentsForConfig: <T extends object>(
    sourceRef: T,
    packagePolicy: ResourcePolicy,
    unwrapTo?: object,
    unwrapFrom?: object
  ) => Partial<T>
  copyWrappedGlobals: CopyWrappedGlobals
  getBuiltinForConfig: <T extends object>(
    moduleNamespace: T,
    moduleId: string,
    policyBuiltin: BuiltinPolicy
  ) => Partial<T>
  createFunctionWrapper: DefaultWrapperFn
  attenuateBuiltin: <T extends object>(
    moduleNamespace: T,
    paths: string[],
    explicitlyBanned?: string[]
  ) => Partial<T>
  makeMinimalViewOfRef: <T extends object>(
    sourceRef: T,
    paths: string[],
    unwrapTo?: object,
    unwrapFrom?: object,
    explicitlyBanned?: string[],
    allowedWriteFields?: Set<string>
  ) => Partial<T>
  copyValueAtPath: CopyValueAtPath
  applyGetSetPropDescTransforms: ApplyGetSetPropDescTransforms
  applyEndowmentPropDescTransforms: ApplyEndowmentPropDescTransforms
}

/**
 * Returns a copy of endowmentsToolkit initialized with the provided
 * configuration.
 *
 * @example Const toolkit = endowmentsToolkit({ handleGlobalWrite: true }) const
 * endowments = toolkit.getEndowmentsForConfig(globalThis, packagePolicy)
 *
 * @param opts Configuration options
 * @returns Endowments toolkit instance
 */
export function endowmentsToolkit({
  createFunctionWrapper = defaultCreateFunctionWrapper,
  handleGlobalWrite = false,
  knownWritableFields = new Set<string>(),
}: EndowmentsToolkitOptions = {}): EndowmentsToolkit {
  return {
    // public API
    getEndowmentsForConfig,
    copyWrappedGlobals,
    getBuiltinForConfig,
    createFunctionWrapper,
    attenuateBuiltin,
    // internals exposed for core
    makeMinimalViewOfRef,
    copyValueAtPath,
    applyGetSetPropDescTransforms,
    applyEndowmentPropDescTransforms,
  }

  /**
   * Creates an object populated with only the deep properties specified in the
   * packagePolicy.
   *
   * @template T Deep properties specified in the packagePolicy
   * @param sourceRef Object from which to copy properties
   * @param packagePolicy LavaMoat policy item representing a package
   * @param unwrapTo For getters and setters, when the this-value is
   *   `unwrapFrom`, is replaced as `unwrapTo`
   * @param unwrapFrom For getters and setters, the this-value to replace
   *   (default: targetRef)
   * @returns The populated targetRef
   */
  function getEndowmentsForConfig<T extends object>(
    sourceRef: T,
    packagePolicy: ResourcePolicy,
    unwrapTo?: object,
    unwrapFrom?: object
  ): Partial<T> {
    if (!packagePolicy.globals) {
      return {}
    }
    const whitelistedReads: string[] = []
    const allowedWriteFields = new Set<string>()
    const explicitlyBanned: string[] = []

    Object.entries(packagePolicy.globals).forEach(
      ([path, packagePolicyValue]: [string, GlobalPolicyValue]) => {
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
        // false means no access
        if (packagePolicyValue === false) {
          explicitlyBanned.push(path)
          return
        }
        whitelistedReads.push(path)
        if (packagePolicyValue === 'write') {
          if (handleGlobalWrite) {
            if (pathParts.length > 1) {
              throw new Error(
                `LavaMoat - write access is only allowed at the top level, saw "${path}"`
              )
            }
            allowedWriteFields.add(path)
          }
        } else if (packagePolicyValue !== true) {
          throw new Error(
            `LavaMoat - unrecognizable policy value (${typeof packagePolicyValue}) for path "${path}"`
          )
        }
      }
    )
    // sort by length to optimize further steps
    whitelistedReads.sort((a, b) => a.length - b.length)
    return makeMinimalViewOfRef(
      sourceRef,
      whitelistedReads,
      unwrapTo,
      unwrapFrom,
      explicitlyBanned,
      allowedWriteFields
    )
  }

  /**
   * Creates an object populated with only the deep properties specified by the
   * paths array.
   *
   * @template T
   * @param sourceRef Source object
   * @param paths Array of dot-notation paths
   * @param unwrapTo Unwrap target
   * @param unwrapFrom Unwrap source
   * @param explicitlyBanned Explicitly banned paths
   * @param allowedWriteFields Fields that may be written
   * @returns Partial view of sourceRef
   */
  function makeMinimalViewOfRef<T extends object>(
    sourceRef: T,
    paths: string[],
    unwrapTo?: object,
    unwrapFrom?: object,
    explicitlyBanned: string[] = [],
    allowedWriteFields: Set<string> = new Set()
  ): Partial<T> {
    const targetRef: Record<PropertyKey, unknown> = {}
    paths.forEach((path) => {
      const pathParts = path.split('.')
      if (knownWritableFields.has(pathParts[0])) {
        if (allowedWriteFields.has(pathParts[0])) {
          makeWritableValueAtPath(
            pathParts[0],
            sourceRef as Record<string, unknown>,
            targetRef,
            createFunctionWrapper,
            unwrapTo,
            // Fall back to targetRef so that method-calls on the returned view
            // correctly unwrap to `unwrapTo` (mirrors original `|| targetRef`).
            unwrapFrom ?? targetRef
          )
        } else {
          instrumentDynamicValueAtPath(
            pathParts,
            sourceRef as Record<string, unknown>,
            targetRef,
            createFunctionWrapper,
            unwrapTo,
            unwrapFrom ?? targetRef
          )
        }
      } else {
        copyValueAtPath(
          '',
          pathParts,
          explicitlyBanned,
          sourceRef,
          targetRef,
          unwrapTo,
          unwrapFrom
        )
      }
    })
    return targetRef as Partial<T>
  }

  /**
   * Creates an object populated with only the deep properties specified in the
   * packagePolicy for builtins.
   *
   * @template T
   * @param moduleNamespace The module namespace object
   * @param paths Allowed paths
   * @param explicitlyBanned Explicitly banned paths
   * @returns Attenuated view of the module namespace
   */
  function attenuateBuiltin<T extends object>(
    moduleNamespace: T,
    paths: string[],
    explicitlyBanned: string[] = []
  ): Partial<T> {
    const moduleNamespaceView = makeMinimalViewOfRef(
      moduleNamespace,
      paths.sort(),
      undefined,
      undefined,
      explicitlyBanned
    )
    return moduleNamespaceView
  }

  /**
   * Creates an object populated with only the deep properties specified in the
   * packagePolicy for builtins.
   *
   * @template T
   * @param moduleNamespace The module namespace object
   * @param moduleId The module identifier (e.g. `'util'`)
   * @param policyBuiltin Builtin policy entry
   * @returns Attenuated view of the module namespace
   */
  function getBuiltinForConfig<T extends object>(
    moduleNamespace: T,
    moduleId: string,
    policyBuiltin: BuiltinPolicy
  ): Partial<T> {
    const builtinPaths: string[] = []
    const explicitlyBanned: string[] = []

    Object.entries(policyBuiltin).forEach(
      ([packagePath, allowed]: [string, boolean]) => {
        const packagePathParts = packagePath.split('.')
        if (moduleId === packagePathParts[0]) {
          const packagePathWithoutPackage = packagePathParts.slice(1).join('.')
          if (allowed === true) {
            builtinPaths.push(packagePathWithoutPackage)
          } else if (allowed === false) {
            explicitlyBanned.push(packagePathWithoutPackage)
          }
        }
      }
    )

    return attenuateBuiltin(moduleNamespace, builtinPaths, explicitlyBanned)
  }

  /**
   * Copies a property from `sourceRef` to `targetRef` at the given path,
   * wrapping getters/setters and function `this`-values as needed.
   */
  function copyValueAtPath(
    visitedPath: string,
    pathParts: string[],
    explicitlyBanned: string[],
    sourceRef: object,
    targetRef: object,
    unwrapTo: object = sourceRef,
    unwrapFrom: object = targetRef
  ): void {
    if (pathParts.length === 0) {
      throw new Error('unable to copy, must have pathParts, was empty')
    }
    const [nextPart, ...remainingParts] = pathParts
    const currentPath = extendPath(visitedPath, nextPart)
    const { prop: sourcePropDesc } = getPropertyDescriptorDeep(
      sourceRef,
      nextPart
    )

    if (isEmpty(sourcePropDesc)) {
      return
    }

    const targetPropDesc = Reflect.getOwnPropertyDescriptor(targetRef, nextPart)
    if (targetPropDesc) {
      if (!('value' in targetPropDesc)) {
        throw new Error(
          `unable to copy on to targetRef, targetRef has a getter at "${currentPath}"`
        )
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const targetValue = targetPropDesc.value
      const valueType = typeof targetValue
      if (valueType !== 'object' && valueType !== 'function') {
        throw new Error(
          `unable to copy on to targetRef, targetRef value is not an obj or func at "${currentPath}"`
        )
      }
    }

    if (remainingParts.length > 0) {
      const { sourceValue, sourceWritable } = getSourceValue(
        sourcePropDesc,
        unwrapTo
      )
      const nextSourceRef = sourceValue as object
      let nextTargetRef: object
      if (targetPropDesc && !explicitlyBanned.includes(currentPath)) {
        nextTargetRef = targetPropDesc.value as object
      } else {
        const containerRef = {}
        const newPropDesc: PropertyDescriptor = {
          value: containerRef,
          writable: sourceWritable,
          enumerable: sourcePropDesc.enumerable,
          configurable: sourcePropDesc.configurable,
        }
        Reflect.defineProperty(targetRef, nextPart, newPropDesc)
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

    if (explicitlyBanned.includes(currentPath)) {
      console.warn(`LavaMoat - conflicting rules exist for "${currentPath}"`)
      return
    }

    if (!('value' in sourcePropDesc)) {
      const wrapperPropDesc = applyGetSetPropDescTransforms(
        sourcePropDesc,
        unwrapFrom,
        unwrapTo
      )
      Reflect.defineProperty(targetRef, nextPart, wrapperPropDesc)
      return
    }

    const { sourceValue, sourceWritable } = getSourceValue(
      sourcePropDesc,
      unwrapTo
    )

    if (typeof sourceValue !== 'function') {
      Reflect.defineProperty(targetRef, nextPart, sourcePropDesc)
      return
    }

    const unwrapTest = (thisValue: unknown): boolean => thisValue === unwrapFrom
    const newValue = createFunctionWrapper(
      sourceValue as (...args: unknown[]) => unknown,
      unwrapTest,
      unwrapTo
    )
    const newPropDesc: PropertyDescriptor = {
      value: newValue,
      writable: sourceWritable,
      enumerable: sourcePropDesc.enumerable,
      configurable: sourcePropDesc.configurable,
    }
    Reflect.defineProperty(targetRef, nextPart, newPropDesc)

    function getSourceValue(
      desc: PropertyDescriptor,
      unwrapToRef: object
    ): { sourceValue: unknown; sourceWritable: boolean | undefined } {
      let sourceValue: unknown, sourceWritable: boolean | undefined
      if ('value' in desc) {
        sourceValue = desc.value
        sourceWritable = desc.writable
      } else if ('get' in desc && desc.get) {
        sourceValue = desc.get.call(unwrapToRef)
        sourceWritable = 'set' in desc
      } else {
        throw new Error(
          'getEndowmentsForConfig - property descriptor missing a getter'
        )
      }
      return { sourceValue, sourceWritable }
    }
  }

  /**
   * Applies both function and get/set transforms to a property descriptor.
   */
  function applyEndowmentPropDescTransforms(
    propDesc: PropertyDescriptor,
    unwrapFromCompartmentGlobalThis: object,
    unwrapToGlobalThis: object
  ): PropertyDescriptor {
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
   * Wraps getter/setter in a property descriptor so that `this`-unwrapping is
   * applied.
   */
  function applyGetSetPropDescTransforms(
    sourcePropDesc: PropertyDescriptor,
    unwrapFromGlobalThis: object,
    unwrapToGlobalThis: object
  ): PropertyDescriptor {
    const wrappedPropDesc = { ...sourcePropDesc }
    if (sourcePropDesc.get) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalGet = sourcePropDesc.get
      wrappedPropDesc.get = function (this: object) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const receiver = this
        const receiverRef =
          receiver === unwrapFromGlobalThis ? unwrapToGlobalThis : receiver
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result = Reflect.apply(originalGet, receiverRef, [])
        if (typeof result === 'function') {
          return createFunctionWrapper(
            result as (...args: unknown[]) => unknown,
            (thisValue) => thisValue === unwrapFromGlobalThis,
            unwrapToGlobalThis
          )
        } else {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return result
        }
      }
    }
    if (sourcePropDesc.set) {
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalSet = sourcePropDesc.set
      wrappedPropDesc.set = function (this: object, value: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const receiver = this
        const receiverRef =
          receiver === unwrapFromGlobalThis ? unwrapToGlobalThis : receiver
        return Reflect.apply(originalSet as (v: unknown) => void, receiverRef, [
          value,
        ])
      }
    }
    return wrappedPropDesc
  }

  /**
   * Wraps a function value in a property descriptor for `this`-unwrapping.
   */
  function applyFunctionPropDescTransform(
    propDesc: PropertyDescriptor,
    unwrapFromCompartmentGlobalThis: object,
    unwrapToGlobalThis: object
  ): PropertyDescriptor {
    if (!('value' in propDesc && typeof propDesc.value === 'function')) {
      return propDesc
    }
    const unwrapTest = (thisValue: unknown): boolean => {
      return thisValue === unwrapFromCompartmentGlobalThis
    }
    const newFn = createFunctionWrapper(
      propDesc.value as (...args: unknown[]) => unknown,
      unwrapTest,
      unwrapToGlobalThis
    )
    return { ...propDesc, value: newFn }
  }

  /**
   * Traverses the prototype chain to find a property descriptor for `key`.
   *
   * @param target Starting object
   * @param key Property key to look up
   * @returns The property descriptor and its receiver, or nulls if not found
   */
  function getPropertyDescriptorDeep(
    target: object | null,
    key: PropertyKey
  ): { prop: PropertyDescriptor | null; receiver: object | null } {
    let receiver: object | null = target
    while (true) {
      if (!receiver) {
        return { prop: null, receiver: null }
      }
      const typeofReceiver = typeof receiver
      if (typeofReceiver === 'object' || typeofReceiver === 'function') {
        const prop = Reflect.getOwnPropertyDescriptor(receiver, key)
        if (prop) {
          return { receiver, prop }
        }
        receiver = Reflect.getPrototypeOf(receiver)
      } else {
        receiver = (receiver as Record<string, unknown>).__proto__ as
          object | null
      }
    }
  }

  /**
   * Copies all enumerable properties from `globalRef`'s prototype chain to
   * `target`, wrapping functions and getters/setters for correct `this`-value
   * handling. Also adds circular globalThis references.
   */
  function copyWrappedGlobals(
    globalRef: object,
    target: Record<PropertyKey, unknown>,
    globalThisRefs: string[] = ['globalThis']
  ): Record<PropertyKey, unknown> {
    const globalProtoChain = getPrototypeChain(globalRef)
    let commonPrototypeIndex = globalProtoChain.findIndex(
      (entry) => entry === Object.prototype
    )
    const noSharedPrototype = commonPrototypeIndex === -1
    if (noSharedPrototype) {
      commonPrototypeIndex = globalProtoChain.length
    }
    const endowmentSources = globalProtoChain.slice(0, commonPrototypeIndex)

    // Trigger lazy getters before collecting descriptors
    endowmentSources.forEach((source) => {
      const descriptors = Object.getOwnPropertyDescriptors(source)
      Object.entries(descriptors).forEach(([key, desc]) => {
        if (
          'get' in desc &&
          desc.get &&
          !GLOBAL_LAZY_GETTERS_TO_AVOID_HITTING.includes(key)
        ) {
          try {
            // eslint-disable-next-line @typescript-eslint/unbound-method
            Reflect.apply(desc.get, globalRef, [])
          } catch {
            // ignore
          }
        }
      })
    })

    const endowmentSourceDescriptors = endowmentSources.map((entry, index) => {
      const candidateDescriptors = Object.getOwnPropertyDescriptors(entry)
      if (noSharedPrototype && index === endowmentSources.length - 1) {
        const filteredDescriptors = Object.fromEntries(
          Object.entries(candidateDescriptors).filter(
            ([key]) => !(key in Object.prototype)
          )
        )
        return filteredDescriptors
      }
      return candidateDescriptors
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const endowmentDescriptorsFlat: Record<string, PropertyDescriptor> =
      Object.assign(
        Object.create(null) as Record<string, PropertyDescriptor>,
        ...endowmentSourceDescriptors.reverse()
      )

    Object.entries(endowmentDescriptorsFlat)
      .filter(([key]) => !(key in target) && !globalThisRefs.includes(key))
      .forEach(([key, desc]) => {
        const wrappedPropDesc = applyEndowmentPropDescTransforms(
          desc,
          target,
          globalRef
        )
        Reflect.defineProperty(target, key, wrappedPropDesc)
      })

    for (const ref of globalThisRefs) {
      if (ref in target) {
        continue
      }
      target[ref] = target
    }
    return target
  }
}

// ---------------------------------------------------------------------------
// Module-level helpers (not exported, used only by endowmentsToolkit internals)
// ---------------------------------------------------------------------------

/**
 * Returns the prototype chain of `value` as an array including the value
 * itself.
 */
function getPrototypeChain(value: unknown): object[] {
  const protoChain: object[] = []
  let current: unknown = value
  while (
    current &&
    (typeof current === 'object' || typeof current === 'function')
  ) {
    protoChain.push(current)
    current = Reflect.getPrototypeOf(current)
  }
  return protoChain
}

/**
 * Extends a dot-notation path string.
 */
function extendPath(visited: string, next: string): string {
  if (!visited || visited.length === 0) {
    return next
  }
  return `${visited}.${next}`
}

/**
 * Returns `true` when `value` is a falsy/empty property descriptor result.
 */
function isEmpty(value: PropertyDescriptor | null): value is null {
  return !value
}

/**
 * Sets up a getter/setter pair so that the specific `targetRef` field is
 * effectively writable and the value propagates to `sourceRef`. This implements
 * the `'write'` permission for a global in a specific resource.
 */
function makeWritableValueAtPath(
  key: string,
  sourceRef: Record<string, unknown>,
  targetRef: Record<PropertyKey, unknown>,
  wrapFn?: DefaultWrapperFn,
  unwrapTo?: object,
  unwrapFrom?: object
): void {
  const enumerable = Reflect.getOwnPropertyDescriptor(
    sourceRef,
    key
  )?.enumerable
  const initialValue = sourceRef[key]
  const wrappedInitialValue =
    wrapFn && unwrapTo && typeof initialValue === 'function'
      ? wrapFn(
          initialValue as (...args: unknown[]) => unknown,
          (thisValue) => thisValue === unwrapFrom,
          unwrapTo
        )
      : initialValue
  Reflect.defineProperty(targetRef, key, {
    configurable: false,
    enumerable,
    set(newValue: unknown) {
      sourceRef[key] = newValue
    },
    get() {
      if (sourceRef[key] === initialValue) {
        return wrappedInitialValue
      }
      return sourceRef[key]
    },
  })
}

/**
 * Puts a getter at the end of the path that returns the nested values from a
 * top-level field that might change at runtime (i.e. a writable field).
 */
function instrumentDynamicValueAtPath(
  pathParts: string[],
  sourceRef: Record<string, unknown>,
  targetRef: Record<PropertyKey, unknown>,
  wrapFn?: DefaultWrapperFn,
  unwrapTo?: object,
  unwrapFrom?: object
): void {
  const enumerable = Reflect.getOwnPropertyDescriptor(
    sourceRef,
    pathParts[0]
  )?.enumerable

  const initialTopValue = sourceRef[pathParts[0]]
  const wrappedInitialTopV =
    wrapFn && unwrapTo && typeof initialTopValue === 'function'
      ? wrapFn(
          initialTopValue as (...args: unknown[]) => unknown,
          (thisValue) => thisValue === unwrapFrom,
          unwrapTo
        )
      : initialTopValue

  const dynamicGetterDesc: PropertyDescriptor = {
    get: () => {
      const dynamicValue = sourceRef[pathParts[0]]
      let leaf: unknown, parent: unknown
      if (
        typeof dynamicValue === 'function' &&
        dynamicValue === initialTopValue
      ) {
        leaf = wrappedInitialTopV
      } else {
        leaf = dynamicValue
      }
      for (let i = 1; i < pathParts.length; i++) {
        parent = leaf
        leaf = (leaf as Record<string, unknown>)[pathParts[i]]
      }
      if (typeof leaf === 'function' && pathParts.length > 1) {
        leaf = (leaf as (...args: unknown[]) => unknown).bind(parent)
      }
      return leaf
    },
    // NOTE: getter descriptors cannot have `writable`; original had a typo
    // "writeable" (ignored) which had the same effect as omitting it.
    enumerable,
    configurable: false,
  }

  let currentTarget = targetRef
  let currentPath = ''
  for (let depth = 0; depth < pathParts.length - 1; depth++) {
    currentPath = extendPath(currentPath, pathParts[depth])
    const nextPart = pathParts[depth]
    if (Reflect.getOwnPropertyDescriptor(currentTarget, nextPart)?.get) {
      throw new Error(
        `LavaMoat - "${pathParts[0]}" is writeable elsewhere and both "${currentPath}" and "${pathParts.join('.')}" are allowed for one package. One of these entries is redundant.`
      )
    }
    if (typeof currentTarget[nextPart] !== 'object') {
      currentTarget[nextPart] = {}
    }
    currentTarget = currentTarget[nextPart] as Record<PropertyKey, unknown>
  }

  const lastPart = pathParts[pathParts.length - 1]
  Reflect.defineProperty(currentTarget, lastPart, dynamicGetterDesc)
}

/**
 * Internal test utilities.
 */
export const _test = {
  instrumentDynamicValueAtPath,
}
