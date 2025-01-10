// FIXME: why did I have to add this? failing in CI
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

import { type ReadNowPowers } from '@endo/compartment-mapper'
import type { LavaMoatPolicy } from '@lavamoat/types'
import type { ExecutionContext } from 'ava'
import { type Volume } from 'memfs/lib/volume.js'
import type { Simplify } from 'type-fest'
import type { GeneratePolicyOptions } from '../../../src/types.js'

/**
 * Options for `testPolicyFor*` macros
 *
 * @internal
 */
export type TestPolicyMacroOptions = {
  /**
   * Expected policy result
   */
  expected?: LavaMoatPolicy

  /**
   * Overrides to apply to policy generation
   */
  policyOverride?: LavaMoatPolicy
}

/**
 * Options for the `testPolicyForJSON` macro
 *
 * @internal
 */
export type TestPolicyForJSONOptions<Context = unknown> = Simplify<
  Omit<GeneratePolicyOptions, 'readPowers'> & {
    /**
     * Expected policy or a function receiving the policy or an assertion
     * function.
     */
    expected?: LavaMoatPolicy | TestPolicyExpectationFn<Context>

    /**
     * Path to entrypoint _within the fixture_. This must be an absolute path or
     * URL.
     *
     * The default is `/index.js`.
     */

    jsonEntrypoint?: string | URL
  }
>

/**
 * Expectation function for {@link TestPolicyForJSONOptions}
 */
export type TestPolicyExpectationFn<Context = unknown> = (
  t: ExecutionContext<Context>,
  policy: LavaMoatPolicy
) => void | Promise<void>

/**
 * Return type of `scaffoldFixture` in `policy-macros.js`
 */
export type ScaffoldFixtureResult = {
  vol: Volume
  readPowers: ReadNowPowers
}

/**
 * Options for `scaffoldFixture` in `policy-macros.js`
 */
export type ScaffoldFixtureOptions = {
  /**
   * The type of fixture to generate
   *
   * @defaultValue 'module'
   */
  sourceType?: 'module' | 'script'
}
