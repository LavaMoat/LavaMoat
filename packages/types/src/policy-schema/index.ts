export type * from './lavamoat-policy.v0-0-1.schema'

// Import the types we want to re-export in the namespace
import type {
    BuiltinPolicy as _BuiltinPolicy,
    DebugInfo as _DebugInfo,
    GlobalPolicy as _GlobalPolicy,
    LavaMoatPolicy as _LavaMoatPolicy,
    LavaMoatPolicyDebug as _LavaMoatPolicyDebug,
    LavaMoatPolicyOverrides as _LavaMoatPolicyOverrides,
    NodeLocation as _NodeLocation,
    PackagePolicy as _PackagePolicy,
    Resolutions as _Resolutions,
    ResourcePolicy as _ResourcePolicy,
    Resources as _Resources,
    RootPolicy as _RootPolicy,
    SesCompat as _SesCompat,
    SesCompatNode as _SesCompatNode,
    SesCompatNodeLocation as _SesCompatNodeLocation,
    SesCompatObj as _SesCompatObj,
} from './lavamoat-policy.v0-0-1.schema'

// Namespace for convenient access in JSDoc comments without global pollution
export namespace LMPolicy {
  export type LavaMoatPolicy = _LavaMoatPolicy
  export type LavaMoatPolicyDebug = _LavaMoatPolicyDebug
  export type DebugInfo = _DebugInfo
  export type SesCompat = _SesCompat
  export type SesCompatObj = _SesCompatObj
  export type SesCompatNode = _SesCompatNode
  export type SesCompatNodeLocation = _SesCompatNodeLocation
  export type NodeLocation = _NodeLocation
  export type Resources = _Resources
  export type Resolutions = _Resolutions
  export type ResourcePolicy = _ResourcePolicy
  export type GlobalPolicy = _GlobalPolicy
  export type PackagePolicy = _PackagePolicy
  export type BuiltinPolicy = _BuiltinPolicy
  export type LavaMoatPolicyOverrides = _LavaMoatPolicyOverrides
  export type RootPolicy = _RootPolicy
}
