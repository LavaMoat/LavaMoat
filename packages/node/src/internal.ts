/**
 * Internal types used by `@lavamoat/node`.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  PackageCompartmentMapDescriptor,
  ReadNowPowers,
  ReadNowPowersProp,
} from '@endo/compartment-mapper'
import type { CanonicalName } from '@endo/compartment-mapper/import.js'
import type {
  BuiltinPolicy,
  GlobalPolicy,
  LavaMoatPolicy,
  Resources,
} from '@lavamoat/types'
import type { PackageJson, ValueOf } from 'type-fest'
import type { SES_VIOLATION_TYPES } from './constants.js'
import type {
  ComposeOptions,
  FileUrlString,
  MergedLavaMoatPolicy,
  WithFs,
  WithLoadForMapOptions,
  WithLog,
  WithPolicyOverride,
  WithPolicyOverrideOnly,
  WithProdOnly,
  WithProjectRoot,
  WithReadFile,
  WithReadPowersAndTrust,
  WithReadPowersAndTrustAndEndoPolicy,
  WithScuttleGlobalThis,
  WithTrustRoot,
} from './types.js'

/**
 * Callback used by `wrapFunctionConstructor`.
 *
 * Given context object `context`, returns `true` if a function being wrapped
 * (not shown) should be called with a provided context (also not shown).
 *
 * @param context Usually a `globalThis`
 * @internal
 */
export type ContextTestFn = (context: object) => boolean

/**
 * Options for `loadCompartmentMapForPolicy()`
 *
 * @internal
 */
export type LoadAndGeneratePolicyOptions = ComposeOptions<
  [
    WithLoadForMapOptions,
    WithReadPowersAndTrust,
    WithPolicyOverride,
    WithProjectRoot,
  ]
>

/**
 * A `globalThis` object with unknown properties.
 *
 * This is basically just an object with anything in it, since we cannot be sure
 * that any given global property is present (or what its type is) in the
 * current compartment at any given time.
 *
 * @internal
 */
export type SomeGlobalThis = Record<PropertyKey, unknown>

/**
 * Options for `readPolicy()`
 *
 * @internal
 */
export type ReadPolicyOptions = ComposeOptions<[WithReadFile]>

/**
 * Options for `readPolicyOverride()`
 *
 * @internal
 */
export type ReadPolicyOverrideOptions = ComposeOptions<[WithReadFile]>

/**
 * Options for `resolveBinScript()`
 *
 * @internal
 */
export type ResolveBinScriptOptions = ComposeOptions<[WithFs, WithFrom]>

/**
 * Options containing a `from` property; used for path resolution
 *
 * @internal
 */
export interface WithFrom {
  /**
   * Where to resolve from
   */
  from?: string | URL
}

/**
 * Options for `resolveEntrypoint()`
 */
export type ResolveEntrypointOptions = ComposeOptions<[WithFrom]>

/**
 * Options for `resolveWorkspace()`
 *
 * @internal
 */
export type ResolveWorkspaceOptions = ResolveBinScriptOptions

/**
 * N array of required properties for {@link ReadNowPowers}
 *
 * @internal
 */
export type RequiredReadNowPowers = ReadonlyArray<
  {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    [K in ReadNowPowersProp]-?: {} extends Pick<ReadNowPowers, K> ? never : K
  }[ReadNowPowersProp]
>

/**
 * Options for `reportInvalidOverrides()`
 *
 * @internal
 */
export type ReportInvalidOverridesOptions = ComposeOptions<
  [
    WithPolicy,
    /**
     * `policyOverridePath` is used only for display purposes; we do not
     * actually attempt to read the policy override file
     */
    WithPolicyPath,
    WithLog,
    {
      maxSuggestions?: number
      what?: 'policy' | 'policy overrides'
    },
  ]
>

/**
 * Options for `reportSesViolations()`
 *
 * @internal
 */
export type ReportSesViolationsOptions = ComposeOptions<[WithLog]>

/**
 * Result of `loadCompartmentMap()`
 *
 * @internal
 */
export interface LoadCompartmentMapResult {
  policy: MergedLavaMoatPolicy
  packageJsonMap: Map<string, PackageJson>
}

/**
 * Options for `makeNodeCompartmentMap()`
 *
 * @internal
 */
export type MakeNodeCompartmentMapOptions = ComposeOptions<
  [
    WithLog,
    WithReadPowersAndTrustAndEndoPolicy,
    WithProdOnly,
    WithPolicyOverrideOnly,
  ]
>

/**
 * Result of `makeNodeCompartmentMap()`
 *
 * @internal
 */
export interface MakeNodeCompartmentMapResult {
  packageJsonMap: Map<CanonicalName, PackageJson>
  packageCompartmentMap: PackageCompartmentMapDescriptor
  unknownCanonicalNames: Set<CanonicalName>
  knownCanonicalNames: Set<CanonicalName>
  rootUsePolicy?: CanonicalName
}

/**
 * Proper names of SES violation types
 *
 * @internal
 */
export type SesViolationType = ValueOf<typeof SES_VIOLATION_TYPES>

/**
 * Options for `makeGlobalsAttenuator()`
 *
 * @internal
 */
export type MakeGlobalsAttenuatorOptions = ComposeOptions<
  [WithPolicy, WithScuttleGlobalThis, WithTrustRoot]
>

/**
 * Options containing a `policy` prop
 *
 * @template T The type of the resources in the policy
 * @internal
 */
export interface WithPolicy<T extends Resources = Resources> {
  policy?: LavaMoatPolicy<T>
}

export interface WithPolicyPath {
  policyPath?: string | URL
}

/**
 * A single structured violation with location information
 *
 * @internal
 */
export interface StructuredViolation {
  /** The file path where the violation occurred */
  path: string
  /** The line number */
  line: number
  /** The column number */
  column: number
  /** The violation type */
  type: string
}

/**
 * Result of structured violations inspection
 *
 * @internal
 */
export interface StructuredViolationsResult {
  /** Primordial mutation violations */
  primordialMutations: StructuredViolation[]
  /** Strict mode violations */
  strictModeViolations: StructuredViolation[]
  /** Dynamic require violations */
  dynamicRequires: StructuredViolation[]
}

/**
 * Per-module inspection results collected during the composed parse pipeline.
 *
 * @internal
 */
export interface ModuleInspectionResult {
  globalPolicy: GlobalPolicy | null
  builtinPolicy: BuiltinPolicy | null
  violations: StructuredViolationsResult | null
}

/**
 * Callback used to report the progress of the module inspection process
 *
 * @param {number} messageCount The number of messages inspected so far
 * @param {Set<FileUrlString>} inspectedModules The modules that have been
 *   inspected so far
 * @param {Set<FileUrlString>} modulesToInspect The modules that still need to
 *   be inspected
 * @returns {number} The new message count
 */
export type ReportModuleInspectionProgressFn = (
  messageCount: number,
  inspectedModules: Set<FileUrlString>,
  modulesToInspect: Set<FileUrlString>
) => number

/**
 * Callback used to report the end of the module inspection process
 *
 * @param {Set<FileUrlString>} inspectedModules The modules that have been
 *   inspected so far
 * @param {Set<FileUrlString>} modulesToInspect The modules that still need to
 *   be inspected
 */
export type ReportModuleInspectionProgressEndFn = (
  inspectedModules: Set<FileUrlString>,
  modulesToInspect: Set<FileUrlString>
) => void

/**
 * Object returned by `createModuleInspectionProgressReporter`
 */
export interface ModuleInspectionProgressReporter {
  reportModuleInspectionProgress: ReportModuleInspectionProgressFn
  reportModuleInspectionProgressEnd: ReportModuleInspectionProgressEndFn
}
