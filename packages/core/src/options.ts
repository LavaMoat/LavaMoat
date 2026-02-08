import type { LavaMoatScuttleOpts } from './scuttle.js'

/**
 * Options for LavaMoat
 */
export interface LavaMoatOpts {
  /**
   * Enable or disable scuttling of `globalThis`
   */
  scuttleGlobalThis?: LavaMoatScuttleOpts

  scuttleGlobalThisExceptions?: string[]

  /**
   * Automatically write a policy file
   */
  writeAutoPolicy?: boolean

  /**
   * Automatically write a debug policy file
   */
  writeAutoPolicyDebug?: boolean

  /**
   * Automatically write a policy file and run the application
   */
  writeAutoPolicyAndRun?: boolean

  /**
   * Path to policy file
   */
  policyPath?: string

  /**
   * Path to policy debug file
   */
  policyDebugPath?: string

  /**
   * Path to policy override file
   */
  policyOverridePath?: string

  /**
   * Path to project root
   */
  projectRoot?: string

  /**
   * Enable debug mode
   */
  debugMode?: boolean

  /**
   * Enable stats mode
   */
  statsMode?: boolean
}
