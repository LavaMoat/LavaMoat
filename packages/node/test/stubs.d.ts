// TODO delete me when we export these types from lavamoat-core properly

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'lavamoat-core/test/util.js' {
  export interface PlatformRunScenarioOpts {
    // NOTE: this loads scenario.d.ts!
    // ALSO: it cannot be replaced with an import statement because reasons
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    scenario: import('lavamoat-core/test/scenarios/scenario.js').NormalizedScenario<Result>
    runWithPrecompiledModules?: boolean
    log?: (...args: any[]) => void
  }

  export type PlatformRunScenario<Result = unknown> = (
    opts: PlatformRunScenarioOpts
  ) => Promise<Result>
}
