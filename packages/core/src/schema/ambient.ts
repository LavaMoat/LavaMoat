/* eslint-disable @typescript-eslint/no-namespace */

/**
 * Because SES will barf if it encounters `import(...)`--even in comments--to
 * use the types within files which it processes, we will need to stuff a
 * namespace in the global scope.
 *
 * @packageDocumentation
 */

declare global {
  namespace LMPolicy {
    export type LavaMoatPolicy = import('./index').LavaMoatPolicy
    export type LavaMoatPolicyDebug = import('./index').LavaMoatPolicyDebug
    export type PartialLavaMoatPolicy = import('./index').PartialLavaMoatPolicy
    export type DebugInfo = import('./index').DebugInfo
    export type SesCompat = import('./index').SesCompat
    export type SesCompatObj = import('./index').SesCompatObj
    export type SesCompatNode = import('./index').SesCompatNode
    export type SesCompatNodeLocation = import('./index').SesCompatNodeLocation
    export type NodeLocation = import('./index').NodeLocation
    export type Resources = import('./index').Resources
    export type Resolutions = import('./index').Resolutions

    export type ResourcePolicy = import('./index').ResourcePolicy
    export type GlobalPolicy = import('./index').GlobalPolicy
    export type PackagePolicy = import('./index').PackagePolicy
  }
}

export {}
