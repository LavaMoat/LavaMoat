/**
 * Scuttling support — replaces every configurable/writable property of
 * `globalThis` with a getter/setter that throws (or warns) on access, so that
 * nothing can reach back out to the host global after LavaMoat has locked down
 * the environment.
 *
 * @remarks
 * **This module is import-free by design.** It runs inside a Compartment and is
 * inlined into generated bundles. No runtime imports are allowed.
 * @packageDocumentation
 */

// All destructuring is done from globalThis at module-evaluation time so the
// module is self-contained and can be safely inlined into a bundle.
const {
  Object: Obj,
  Array: Arr,
  Error: Err,
  RegExp: RE,
  Set: SetCtor,
  console: Con,
  Proxy: ProxyCtor,
  Reflect: Refl,
} = globalThis as unknown as {
  Object: typeof Object
  Array: typeof Array
  Error: typeof Error
  RegExp: typeof RegExp
  Set: typeof Set
  console: typeof console
  Proxy: typeof Proxy
  Reflect: typeof Reflect
}

const {
  assign,
  getOwnPropertyNames,
  getOwnPropertyDescriptor,
  create,
  defineProperty,
} = Obj

/**
 * List of properties to preserve when scuttling. These are intrinsics that a
 * Compartment already grants, plus LavaMoat / SES APIs and polyfills that
 * LavaMoat depends on.
 */
const preserveLanguageIntrinsics: string[] = (function (
  globalThisCompartment: { [k: string]: unknown },
  gt: { [k: string]: unknown }
) {
  return (
    Obj.getOwnPropertyNames(globalThisCompartment)
      // skip all intrinsics that a Compartment already grants
      .filter((a) => globalThisCompartment[a] === gt[a])
      // support LM, SES exported APIs and polyfills that LM counts on
      .concat(['Compartment', 'Error', 'globalThis'])
  )
})(new Compartment().globalThis as { [k: string]: unknown }, globalThis)

const { isArray, from } = Arr
const { getPrototypeOf } = Refl
// eslint-disable-next-line @typescript-eslint/unbound-method
const { warn } = Con

const uncurryThis = Function.prototype.bind.bind(
  // eslint-disable-next-line @typescript-eslint/unbound-method
  Function.prototype.call
)
const stringSplit = uncurryThis(
  // eslint-disable-next-line @typescript-eslint/unbound-method
  String.prototype.split
) as (s: string, sep: string) => string[]

/**
 * Options for scuttling `globalThis`.
 */
export interface LavaMoatScuttleOpts {
  /**
   * Whether scuttling is enabled or not.
   */
  enabled?: boolean
  /**
   * List of properties to exclude from scuttling.
   */
  exceptions?: (string | RegExp)[]
  /**
   * Name of the scuttler function to use, expected to be found as a property on
   * the global object (e.g. if `scuttlerName` is `'x'`, the scuttler function
   * is obtained from `globalThis['x']`).
   */
  scuttlerName?: string
}

/**
 * Internal resolved scuttle options with a concrete scuttler function.
 */
interface ResolvedScuttleOpts {
  enabled: boolean
  exceptions: (string | RegExp)[]
  scuttlerName: string
  scuttlerFunc: (
    globalRef: Record<PropertyKey, unknown>,
    scuttle: (realm: Record<PropertyKey, unknown>) => void
  ) => void
}

/**
 * Applies scuttling, with the default set of options, including using Snow if
 * passed in as `scuttlerFunc`. Scuttle `globalThis` right after using it to
 * create the root-package compartment.
 *
 * @example scuttle(globalThis, { enabled: true, exceptions: ['myGlobal'] })
 *
 * @param globalRef Reference to the global object.
 * @param opts Scuttling options.
 */
export function scuttle(
  globalRef: Record<PropertyKey, unknown>,
  opts?: LavaMoatScuttleOpts | boolean
): void {
  const scuttleOpts = generateScuttleOpts(globalRef, opts)

  if (scuttleOpts.enabled) {
    if (!isArray(scuttleOpts.exceptions)) {
      throw new Err(
        `LavaMoat - exceptions must be an array, got ${typeof scuttleOpts.exceptions}`
      )
    }
    scuttleOpts.scuttlerFunc(globalRef, (realm) =>
      performScuttleGlobalThis(realm, scuttleOpts.exceptions)
    )
  }
}

/**
 * Builds the resolved scuttle options from raw user-supplied options.
 *
 * @param globalRef Reference to the global object.
 * @param originalOpts Raw scuttling options (or `true` for backwards
 *   compatibility).
 * @returns Final scuttling options.
 */
function generateScuttleOpts(
  globalRef: Record<PropertyKey, unknown>,
  originalOpts: LavaMoatScuttleOpts | boolean | undefined = create(
    null
  ) as LavaMoatScuttleOpts
): ResolvedScuttleOpts {
  const defaultOpts: LavaMoatScuttleOpts = {
    enabled: true,
    exceptions: [],
    scuttlerName: '',
  }
  const opts = assign(
    create(null) as ResolvedScuttleOpts,
    originalOpts === true ? defaultOpts : (originalOpts as LavaMoatScuttleOpts),
    {
      scuttlerFunc: (
        globalRef: Record<PropertyKey, unknown>,
        scuttle: (realm: Record<PropertyKey, unknown>) => void
      ) => scuttle(globalRef),
    },
    {
      exceptions: (
        (originalOpts as LavaMoatScuttleOpts)?.exceptions ||
        defaultOpts.exceptions!
      ).map((e) => toRE(e)),
    }
  )
  if (opts.scuttlerName) {
    if (!globalRef[opts.scuttlerName]) {
      throw new Err(
        `LavaMoat - 'scuttlerName' function "${opts.scuttlerName}" expected on globalRef.` +
          'To learn more visit https://github.com/LavaMoat/LavaMoat/pull/462.'
      )
    }
    opts.scuttlerFunc = globalRef[
      opts.scuttlerName
    ] as ResolvedScuttleOpts['scuttlerFunc']
  }
  return opts

  /**
   * Converts a string-encoded regex (`/pattern/flags`) or plain string into a
   * `RegExp` or leaves it as a string.
   */
  function toRE(except: string | RegExp): string | RegExp {
    if (typeof except !== 'string' || !except.startsWith('/')) {
      return except
    }
    const parts = except.split('/')
    const pattern = parts.slice(1, -1).join('/')
    const flags = parts[parts.length - 1]
    return new RE(pattern, flags)
  }
}

/**
 * Runs scuttling on the `globalRef`. Use `scuttle` for the full option scope.
 *
 * @param globalRef Reference to the global object.
 * @param extraPropsToAvoid Additional properties to exclude from scuttling
 *   beyond the default ones.
 */
function performScuttleGlobalThis(
  globalRef: Record<PropertyKey, unknown>,
  extraPropsToAvoid: (string | RegExp)[] = []
): void {
  const props: string[] = []
  getPrototypeChain(globalRef).forEach((proto) =>
    props.push(...getOwnPropertyNames(proto))
  )

  const propsToAvoid = new SetCtor<string | RegExp>([
    ...preserveLanguageIntrinsics,
    ...extraPropsToAvoid,
  ])

  const obj = create(null) as Record<PropertyKey, unknown>
  props.forEach((prop) => {
    const { get, set } = generateInvokers(prop)
    if (shouldAvoidProp(propsToAvoid, prop)) {
      return
    }
    let desc = getOwnPropertyDescriptor(globalRef, prop)
    if (desc?.configurable === true) {
      desc = { configurable: false, set, get }
    } else if (desc?.writable === true) {
      const p = new ProxyCtor(obj, {
        getPrototypeOf: get as unknown as () => object | null,
        get: get,
        set: set as unknown as ProxyHandler<typeof obj>['set'],
      })
      desc = { configurable: false, writable: false, value: p }
    } else {
      return
    }
    defineProperty(globalRef, prop, desc)
  })
}

/**
 * Generates a getter and setter that warn and throw when a scuttled property is
 * accessed.
 */
function generateInvokers(prop: string): {
  get: () => void
  set: () => void
} {
  return { get, set }

  function set(): void {
    warn(
      `LavaMoat - property "${prop}" of globalThis cannot be set under scuttling mode. ` +
        'To learn more visit https://github.com/LavaMoat/LavaMoat/issues/2127.'
    )
  }

  function get(): void {
    const err = new Err('')
    const msg =
      `LavaMoat - property "${prop}" of globalThis is inaccessible under scuttling mode. ` +
      'To learn more visit https://github.com/LavaMoat/LavaMoat/issues/2127.'

    warn(msg)
    if (err.stack && stringSplit(err.stack, '\n').length > 2) {
      err.message = msg
      throw err
    }
  }
}

/**
 * Returns whether a property should be excluded from scuttling.
 */
const shouldAvoidProp = (
  propsToAvoid: Set<string | RegExp>,
  prop: string
): boolean =>
  from(propsToAvoid).some(
    (avoid) =>
      (typeof avoid === 'string' && avoid === prop) ||
      (avoid instanceof RE && avoid.test(prop))
  )

/**
 * Returns the prototype chain of `value` as an array starting with `value`.
 */
function getPrototypeChain(value: object): object[] {
  const protoChain: object[] = []
  let current: object | null = value
  while (current) {
    if (typeof current !== 'object' && typeof current !== 'function') {
      break
    }
    protoChain.push(current)
    current = getPrototypeOf(current)
  }
  return protoChain
}
