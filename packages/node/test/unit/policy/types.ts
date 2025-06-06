// FIXME: why did I have to add this? failing in CI
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

import { type ReadNowPowers } from '@endo/compartment-mapper'
import type { ExecutionContext } from 'ava'
import type { LavaMoatPolicy } from 'lavamoat-core'
import { type Volume } from 'memfs/lib/volume.js'
import type { Simplify } from 'type-fest'
import type {
  GeneratePolicyOptions,
  WithLog,
  WithPolicyOverrideOnly,
} from '../../../src/types.js'

/**
 * Options for `testPolicyFor*` macros
 *
 * @internal
 */
export type TestPolicyMacroOptions = Simplify<
  {
    /**
     * Expected policy result
     */
    expected?: LavaMoatPolicy
  } & WithPolicyOverrideOnly &
    WithLog
>

/**
 * Options for the `testPolicyForJSON` macro
 *
 * @internal
 */
export type TestPolicyForJSONOptions<Context = unknown> = Simplify<
  Omit<GeneratePolicyOptions, 'readPowers' | 'policyOverridePath'> & {
    /**
     * Expected policy or a function receiving the policy or an assertion
     * function.
     */
    expected?: LavaMoatPolicy | TestPolicyExpectationFn<Context>

    /**
     * Path to entrypoint _within the fixture_. This must be an absolute path or
     * URL. It must begin with the virtual filesystem root, which is `/`.
     *
     * The default is `/index.js`.
     */

    jsonEntrypoint?: string | URL
  } & WithPolicyOverrideOnly
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
