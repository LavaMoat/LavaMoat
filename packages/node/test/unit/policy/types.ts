import { LavaMoatPolicy, LavaMoatPolicyOverrides } from 'lavamoat-core'
import { Except, Merge } from 'type-fest'
import { GeneratePolicyOptions } from '../../../src/types.js'

/**
 * Options for `testPolicyFor*` macros
 *
 * @internal
 */
export interface TestPolicyMacroOptions {
  /**
   * Expected policy result
   */
  expected?: LavaMoatPolicy
  /**
   * Overrides to apply to policy generation
   */
  policyOverride?: LavaMoatPolicyOverrides
}

/**
 * Options for the `testPolicyForJSON` macro
 *
 * @internal
 */
export type TestPolicyForJSONOptions = Merge<
  Except<GeneratePolicyOptions, 'readPowers'>,
  {
    /**
     * Path to entrypoint _within the fixture_. This must be an absolute path or
     * URL.
     *
     * The default is `/index.js`.
     */

    jsonEntrypoint?: string | URL
  }
>
