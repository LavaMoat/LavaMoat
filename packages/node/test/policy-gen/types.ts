import { LavaMoatPolicy, LavaMoatPolicyOverrides } from 'lavamoat-core'
import { Except } from 'type-fest'
import { GeneratePolicyOptions } from '../../src/types.js'

/**
 * Options for the `testPolicyMacro` macro
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
export type TestPolicyForJSONOptions = Except<
  GeneratePolicyOptions,
  'readPowers'
>
