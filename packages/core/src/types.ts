import type E from './endowmentsToolkit'
import type { LavaMoatScuttleOpts } from './scuttle'

export type * from './codeSampleFromAstNode'
export type * from './generatePolicy'
export * from './index'
export type * from './moduleRecord'
export type * from './parseForPolicy'

export { E as EndowmentsToolkitFactory, LavaMoatScuttleOpts }

// Ended up moving options here, because typescript was failing to resolve LavaMoatScuttleOpts  
/**
 * Options for LavaMoat cli
 */
export interface LavaMoatOpts {
    /**
     * Enable or disable scuttling of `globalThis`
     */
    scuttleGlobalThis?: LavaMoatScuttleOpts
    /**
     * **deprecated** Exceptions in LavaMoatOpts can't be regexp because they get passed as cli args
     */
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
