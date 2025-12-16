/* eslint-disable @typescript-eslint/no-explicit-any */
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
import type { MessageTypes, SES_VIOLATION_TYPES } from './constants.js'
import type {
  ComposeOptions,
  FileUrlString,
  MergedLavaMoatPolicy,
  SourceType,
  WithDev,
  WithFs,
  WithLoadForMapOptions,
  WithLog,
  WithPolicyOverride,
  WithPolicyOverrideOnly,
  WithProjectRoot,
  WithReadFile,
  WithReadPowersAndTrust,
  WithReadPowersAndTrustAndEndoPolicy,
  WithScuttleGlobalThis,
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
 * A function _or_ a constructor.
 *
 * @privateRemarks
 * I'm not entirely sure why `Function` does not satify one of the first two
 * union members, but it has to be here.
 * @internal
 */
export type SomeFunction =
  | (new (...args: any[]) => any)
  | ((...args: any[]) => any)
  // eslint-disable-next-line @typescript-eslint/ban-types
  | Function

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
 * The parameters of a {@link SomeFunction}
 *
 * @template T Function or constructor
 * @internal
 */
export type SomeParameters<T extends SomeFunction> = T extends new (
  ...args: any[]
) => any
  ? ConstructorParameters<T>
  : T extends (...args: any[]) => any
    ? Parameters<T>
    : never

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
    // eslint-disable-next-line @typescript-eslint/ban-types
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
    WithDev,
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
  [WithPolicy, WithScuttleGlobalThis]
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
 * Base message type with required type property and id
 *
 * @internal
 */
export interface BaseMessage {
  /** Message type discriminant */
  type: string
  /** Task identifier */
  id: string
}

/**
 * Options for {@link WorkerPool} constructor
 *
 * @template _TMessage Message type that extends BaseMessage
 * @template _TResponse Response type that extends BaseMessage
 * @internal
 */
export interface WorkerPoolOptions<
  _TMessage extends BaseMessage = BaseMessage,
  _TResponse extends BaseMessage = BaseMessage,
> {
  /** How long workers can be idle before termination (ms) */
  idleTimeout?: number
}

/**
 * Message type for requesting inspection
 *
 * @internal
 */
export interface InspectMessage {
  /** Message type (discriminant) */
  type: (typeof MessageTypes)['Inspect']
  /** Source bytes */
  source: Uint8Array
  /** Type of source */
  sourceType: SourceType
  /** Identifier for the source (file:// URL) */
  id: FileUrlString
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
 * Message type for responding with global policy
 *
 * @internal
 */
export interface InspectionResultsMessage {
  /** Message type (discriminant) */
  type: (typeof MessageTypes)['InspectionResults']
  /** The resulting global policy */
  globalPolicy: GlobalPolicy | null
  /** The resulting builtin policy */
  builtinPolicy: BuiltinPolicy | null
  /** The resulting SES compatibility violations */
  violations?: StructuredViolationsResult | null
  /** Identifier for the source (file:// URL) */
  id: FileUrlString
}

/**
 * Message type for responding with an error
 *
 * @internal
 */
export interface ErrorMessage {
  /** Message type (discriminant) */
  type: (typeof MessageTypes)['Error']
  /** Error message */
  error: string
  /** Identifier for the source (file:// URL) */
  id: FileUrlString
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
