import { LavamoatModuleRecord } from '../module-record'

/**
 * Schema for LavaMoat policy override files
 *
 * Alias of {@link LavaMoatPolicy}
 *
 * @deprecated Use {@link LavaMoatPolicy} instead
 */
export type LavaMoatPolicyOverrides = LavaMoatPolicy

/**
 * Schema for LavaMoat "debug" policy files
 */
export type LavaMoatPolicyDebug<T extends Resources = Resources> =
  LavaMoatPolicy<T> & {
    debugInfo: Record<string, DebugInfo>
  }

/**
 * Schema for LavaMoat policy files
 */
export interface LavaMoatPolicy<T extends Resources = Resources> {
  /**
   * Resource policy for all packages in the application
   */
  resources: T

  /**
   * Module resolution mapping
   *
   * @deprecated Resolutions are better handled by package managers. A future
   *   version will remove support for this field.
   */
  resolutions?: Resolutions

  /**
   * If this is set, then the root package is considered untrusted and will have
   * a matching policy in {@link LavaMoatPolicy.resources}
   */
  root?: RootPolicy<T>
}

/**
 * Root configuration
 *
 * @template T The value of {@link LavaMoatPolicy.resources}
 */
export interface RootPolicy<T extends Resources = Resources> {
  /**
   * Reference to a package name in {@link LavaMoatPolicy.resources}.
   *
   * The root will inherit policy from this package.
   */
  usePolicy?: keyof T
}

export interface DebugInfo {
  /**
   * @todo This is an array of `@babel/parser`'s `ParseError`.
   */
  parseErrors?: { code: string; reasonCode: string }[]
  moduleRecord: Omit<LavamoatModuleRecord, 'ast'>
  /**
   * @todo Move these types into lavamoat-tofu
   */
  sesCompat: SesCompat
  globals: Record<string, boolean>

  builtin: string[]
}

export interface SesCompat {
  dynamicRequires: SesCompatObj[]
  primordialMutations: SesCompatObj[]
  strictModeViolations: SesCompatObj[]
}

export interface SesCompatObj {
  node: SesCompatNode
}

export interface SesCompatNode {
  loc: SesCompatNodeLocation
}

export interface SesCompatNodeLocation {
  start: NodeLocation
  end: NodeLocation
}

export interface NodeLocation {
  column: number
  index: number
  line: number
}

/**
 * @deprecated - Use `true` instead
 */
export type GlobalPolicyRead = 'read'

/**
 * A writable global property
 */
export type GlobalPolicyWrite = 'write'

/**
 * A property which can be defined via {@link Object.defineProperty} and/or
 * {@link Object.defineProperties}
 */
export type GlobalPolicyRedefine = 'redefine'

/**
 * Possible values for global policy
 */
export type GlobalPolicyValue =
  | boolean
  | GlobalPolicyRead
  | GlobalPolicyRedefine
  | GlobalPolicyWrite

/**
 * Describe the resources available to your application and direct dependencies
 */
export interface Resources {
  [k: string]: ResourcePolicy
}

export interface ResourcePolicy {
  globals?: GlobalPolicy
  builtin?: BuiltinPolicy
  packages?: PackagePolicy
  /**
   * Allow native modules
   */
  native?: boolean
}

/**
 * Globals (including properties using dot notation) accessible to the module;
 * `true` to allow and `false` to deny
 */
export interface GlobalPolicy {
  [k: string]: GlobalPolicyValue
}

/**
 * Node.js builtins (including properties using dot notation); `true` to allow
 * and `false` to deny
 */
export interface BuiltinPolicy {
  [k: string]: boolean
}

/**
 * Additional external packages (in their entirety) accessible to the module;
 * `true` to allow and `false` to deny
 */
export interface PackagePolicy {
  [k: string]: boolean
}
/**
 * Custom run-time module resolutions by direct dependency
 */
export interface Resolutions {
  /**
   * The key is the dependency name
   */
  [k: string]: {
    /**
     * The key is the original module path and the value is the new module path
     */
    [k: string]: string
  }
}

/**
 * For use with type-narrowing
 */
export type SomeLavaMoatPolicy = LavaMoatPolicy<any>
