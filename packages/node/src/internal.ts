/**
 * Internal types used by `@lavamoat/node`.
 *
 * @packageDocumentation
 * @internal
 */

import type {
  MapNodeModulesOptions,
  PackageCompartmentMapDescriptor,
  ReadNowPowers,
  ReadNowPowersProp,
} from '@endo/compartment-mapper'
import type { CanonicalName } from '@endo/compartment-mapper/import.js'
import type {
  BuiltinPolicy,
  GlobalPolicy,
  GlobalPolicyValue,
  LavaMoatPolicy,
  Resources,
} from '@lavamoat/types'
import type { PackageJson, ValueOf } from 'type-fest'
import type { SES_VIOLATION_TYPES } from './constants.js'
import type {
  ComposeOptions,
  Merged,
  WithFs,
  WithLoadForMapOptions,
  WithLog,
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
 * Options bucket containing a `compact` prop
 *
 * @internal
 */
export interface WithCompact {
  /**
   * When `true`, compute a compacted policy override (see
   * `compactPolicyOverride`) and return it as `compactedPolicyOverride` on the
   * result. Has no effect when no `policyOverride` was provided.
   */
  compact?: boolean
}

/**
 * Options for `loadCompartmentMapForPolicy()`
 *
 * @internal
 */
export type LoadAndGeneratePolicyOptions = ComposeOptions<
  [
    WithLoadForMapOptions,
    WithReadPowersAndTrust,
    { policyOverride?: LavaMoatPolicy },
    WithProjectRoot,
    WithCompact,
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
 * The primary half of {@link ResolvedPolicySources}: exactly one of `policyPath`
 * or `policy` is set.
 *
 * @internal
 */
export type ResolvedPrimarySource =
  | { policyPath: string; policy?: never }
  | { policyPath?: never; policy: LavaMoatPolicy }

/**
 * The override half of {@link ResolvedPolicySources}: at most one of
 * `overridePath` or `overridePolicy` is set. Both are absent when the override
 * source is `{ kind: 'none' }`.
 *
 * @internal
 */
export type ResolvedOverrideSource =
  | { overridePath: string; overridePolicy?: never }
  | { overridePath?: never; overridePolicy: LavaMoatPolicy }
  | { overridePath?: never; overridePolicy?: never }

/**
 * Concrete paths and/or inline values resolved from a {@link PolicyInput}.
 *
 * Produced by `resolvePolicySources`. Modelled as the intersection of two
 * discriminated XOR pairs so consumers can narrow `policy` vs `policyPath` (and
 * `overridePolicy` vs `overridePath`) via property access on the resolved
 * object.
 *
 * @internal
 */
export type ResolvedPolicySources = ResolvedPrimarySource &
  ResolvedOverrideSource

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
 * Options for {@link reportInvalidCanonicalNames}
 *
 * @internal
 */
export type ReportInvalidCanonicalNames = ComposeOptions<
  [
    WithPolicy,
    /**
     * `policyOverridePath` is used only for display purposes; we do not
     * actually attempt to read the policy override file
     */
    WithPolicyPath,
    WithLog,
    {
      /**
       * Maximum number of suggestions to make when reporting invalid canonical
       * names
       *
       * @defaultValue 3
       */
      maxSuggestions?: number
      /**
       * Description of the policy type being reported
       *
       * @defaultValue 'policy'
       */
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
 * Result of `loadAndGeneratePolicy()`
 *
 * @internal
 */
export interface LoadAndGeneratePolicyResult {
  policy: Merged<LavaMoatPolicy>
  packageJsonMap: Map<string, PackageJson>
  hasWarnings: boolean
  /**
   * Present only when `compact: true` was passed in options **and** a
   * `policyOverride` was provided. Contains the policy override with all
   * entries already covered by the generated policy removed.
   */
  compactedPolicyOverride?: LavaMoatPolicy
}

/**
 * Subset of {@link MapNodeModulesOptions} that consumers of
 * {@link makeNodeCompartmentMap} may pass through. The fields
 * {@link makeNodeCompartmentMap} controls itself are excluded.
 *
 * Notably, this allows consumers to provide their own `packageDependenciesHook`
 * — used by the policy-generation path to seed override-listed dependencies
 * into the dependency graph.
 *
 * @internal
 */
export type ConsumerMapNodeModulesOptions = Omit<
  MapNodeModulesOptions,
  | 'conditions'
  | 'dev'
  | 'languageForExtension'
  | 'policy'
  | 'log'
  | 'packageDataHook'
  | 'unknownCanonicalNameHook'
>

/**
 * Options bucket containing a `mapNodeModulesOptions` prop
 *
 * @internal
 */
export interface WithMapNodeModulesOptions {
  /**
   * Pass-through subset of {@link MapNodeModulesOptions} forwarded to
   * `mapNodeModules`. Use this to inject hooks (e.g. `packageDependenciesHook`)
   * without coupling {@link makeNodeCompartmentMap} to consumer-specific
   * concerns.
   */
  mapNodeModulesOptions?: ConsumerMapNodeModulesOptions
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
    WithMapNodeModulesOptions,
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
 * @param inspectedModules The modules that have been inspected so far
 * @param modulesToInspect The modules that still need to be inspected
 * @returns The new message count
 * @internal
 */
export type ReportModuleInspectionProgressFn = (
  inspectedModules: Set<string>,
  modulesToInspect: Set<string>
) => void

/**
 * Callback used to report the end of the module inspection process
 *
 * @param inspectedModules The modules that have been inspected so far
 * @param modulesToInspect The modules that still need to be inspected
 * @internal
 */
export type ReportModuleInspectionProgressEndFn = (
  inspectedModules: Set<string>,
  modulesToInspect: Set<string>
) => void

/**
 * Object returned by `createModuleInspectionProgressReporter`
 *
 * @internal
 */
export interface ModuleInspectionProgressReporter {
  reportModuleInspectionProgress: ReportModuleInspectionProgressFn
  reportModuleInspectionProgressEnd: ReportModuleInspectionProgressEndFn
}

/**
 * Worker data passed to the policy-generation worker thread.
 *
 * @internal
 */
export interface PolicyGenWorkerData {
  /**
   * List of symbols referencing `globalThis`
   */
  globalRefs: readonly string[]
  /**
   * Per-language overrides for globals options. When present and the worker
   * receives a message with a matching `language`, these options are merged
   * with `globalsOptions`, with per-language values taking precedence.
   */
  globalsOptionsByLanguage?: Record<
    string,
    { ignoredRefs?: readonly string[]; globalRefs?: readonly string[] }
  >

  /**
   * List of builtin modules
   */
  builtinModules: readonly string[]
}

/**
 * Combined result returned by `createPolicyGenAnalyzerPass`.
 *
 * All three logical analyses (globals, builtins, violations) are performed in a
 * single Babel traversal and returned as named fields to avoid positional tuple
 * fragility.
 *
 * @internal
 */
export interface PolicyGenAnalysisResults {
  /** Map of global name to policy value. */
  globals: GlobalsAnalyzerResults
  /** Set of builtin module names referenced by the module. */
  builtins: BuiltinsAnalyzerResults
  /** Serialized SES-compatibility violations, or `null` if none. */
  violations: ViolationsAnalyzerResults
}

export interface ModuleInspectionProgressReporterOptions {
  /**
   * Reporter to use to report the progress of the module inspection process
   */
  reporter: ModuleInspectionProgressReporter
  /**
   * Modules to inspect
   */
  modulesToInspect: Set<string>
  /**
   * Modules that have been inspected
   */
  inspectedModules: Set<string>
}

/**
 * Options for {@link createPolicyGenWorkerParsers}
 *
 * @internal
 */
export type CreatePolicyGenWorkerParsersOptions =
  | (WithLog & ModuleInspectionProgressReporterOptions)
  | WithLog

/**
 * Options for {@link createMjsExecParser} and {@link createCjsExecParser}
 */
export type ExecParserFactoryOptions = WithLog

export type GlobalsAnalyzerResults = Map<string, GlobalPolicyValue>

export type BuiltinsAnalyzerResults = Set<string>

/**
 * A structured-clone-safe snapshot of a single violation location.
 */
export interface ViolationLocation {
  line: number
  column: number
}

/**
 * Serialized violations result suitable for transfer via `postMessage`.
 *
 * Unlike the raw `InspectSesCompatResult` from `lavamoat-tofu`, this type
 * contains only plain numeric location data (no Babel path / AST node objects),
 * making it safe to transfer with the structured clone algorithm.
 *
 * @internal
 */
export type ViolationsAnalyzerResults = {
  primordialMutations: ViolationLocation[]
  strictModeViolations: ViolationLocation[]
  dynamicRequires: ViolationLocation[]
} | null
