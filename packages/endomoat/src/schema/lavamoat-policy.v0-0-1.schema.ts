import { RequireAtLeastOne } from 'type-fest'

/**
 * Schema for LavaMoat policy files
 */
export type LavaMoatPolicy = RequireAtLeastOne<
  PartialLavaMoatPolicy,
  'resources' | 'resolutions'
>

export interface PartialLavaMoatPolicy {
  resources?: Resources
  resolutions?: Resolutions
}

/**
 * Describe the resources available to your application and direct dependencies
 */
export interface Resources {
  [k: string]: ResourcePolicy
}

export interface ResourcePolicy {
  globals?: Globals
  builtins?: NodeJsBuiltins
  packages?: ExternalPackages
}

/**
 * Globals (including properties using dot notation) accessible to the module; `true` to allow and `false` to deny
 */
export interface Globals {
  [k: string]: boolean
}

/**
 * Node.js builtins (including properties using dot notation); `true` to allow and `false` to deny
 */
export interface NodeJsBuiltins {
  [k: string]: boolean
}

/**
 * Additional external packages (in their entirety) accessible to the module; `true` to allow and `false` to deny
 */
export interface ExternalPackages {
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
