import { RequireAtLeastOne } from 'type-fest'
import { LavamoatModuleRecord } from '../moduleRecord'

export interface DebugInfo {
  builtin: string[]
  globals: Record<string, boolean>
  moduleRecord: Omit<LavamoatModuleRecord, 'ast'>

  /**
   * @todo This is an array of `@babel/parser`'s `ParseError`. To use it
   *   directly we'd need to add `@babel/parser` as a production dependency of
   *   `lavamoat-tofu`, and I don't want to do that right now.
   */
  parseErrors?: { code: string; reasonCode: string }[]

  /**
   * @todo Move these types into lavamoat-tofu
   */
  sesCompat: SesCompat
}

export interface NodeLocation {
  column: number
  index: number
  line: number
}

/**
 * Alias for {@link LavaMoatPolicyOverrides}
 *
 * @template T The value of {@link LavaMoatPolicy.resources}
 */
export interface PartialLavaMoatPolicy<T extends Resources = Resources> {
  resolutions?: Resolutions
  resources?: T
  root?: RootPolicy<T>
}

/**
 * Custom run-time module resolutions by direct dependency
 *
 * @deprecated
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

export interface ResourcePolicy {
  /**
   * Policy for accessing builtins (e.g., Node.js builtins)
   */
  builtin?: BuiltinPolicy

  /**
   * Policy for reading/writing globals
   */
  globals?: GlobalPolicy

  /**
   * Allow native modules
   */
  native?: boolean

  /**
   * Policy for accessing other packages
   */
  packages?: PackagePolicy
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

export interface SesCompat {
  dynamicRequires: SesCompatObj[]
  primordialMutations: SesCompatObj[]
  strictModeViolations: SesCompatObj[]
}

export interface SesCompatNode {
  loc: SesCompatNodeLocation
}

export interface SesCompatNodeLocation {
  end: NodeLocation
  start: NodeLocation
}

export interface SesCompatObj {
  node: SesCompatNode
}

/**
 * Node.js builtins (including properties using dot notation); `true` to allow
 * and `false` to deny
 */
export type BuiltinPolicy = Record<string, boolean>

/**
 * Globals (including properties using dot notation) accessible to the module;
 * `true` to allow and `false` to deny
 */
export type GlobalPolicy = Record<string, GlobalPolicyValue>

/**
 * Represents a global which is allowed to be read but not written to
 *
 * @deprecated - Use `true` instead
 */
export type GlobalPolicyRead = 'read'

/**
 * Describes access to a particular global value
 */
export type GlobalPolicyValue = GlobalPolicyRead | GlobalPolicyWrite | boolean

/**
 * Represents a global which is allowed to be written to
 */
export type GlobalPolicyWrite = 'write'

/**
 * Schema for LavaMoat policy files
 *
 * @template T The value of {@link LavaMoatPolicy.resources}
 */
export type LavaMoatPolicy<T extends Resources = Resources> = RequireAtLeastOne<
  PartialLavaMoatPolicy<T>,
  'resources' | 'resolutions'
>

/**
 * A "debug" policy containing additional information
 *
 * @template T The value of {@link LavaMoatPolicy.resources}
 */
export type LavaMoatPolicyDebug<T extends Resources = Resources> =
  LavaMoatPolicy<T> & {
    debugInfo: Record<string, DebugInfo>
  }

/**
 * Overrides for generated policy.
 *
 * @template T The value of {@link LavaMoatPolicy.resources}
 */
export type LavaMoatPolicyOverrides<T extends Resources = Resources> =
  PartialLavaMoatPolicy<T>

/**
 * Additional external packages (in their entirety) accessible to the module;
 * `true` to allow and `false` to deny
 */
export type PackagePolicy = Record<string, boolean>

/**
 * The most generic type of {@link LavaMoatPolicy.resources} ({@link Resources})
 */
export type Resources = Record<string, ResourcePolicy>
