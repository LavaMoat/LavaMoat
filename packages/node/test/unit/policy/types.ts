// FIXME: why did I have to add this? failing in CI
/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

import { type ReadNowPowers } from '@endo/compartment-mapper'
import type { ExecutionContext } from 'ava'
import type { LavaMoatPolicy } from 'lavamoat-core'
import { type Volume } from 'memfs/lib/volume.js'
import type {
  ComposeOptions,
  GeneratePolicyOptions,
  MergedLavaMoatPolicy,
  WithLog,
  WithPolicyOverrideOnly,
} from '../../../src/types.js'
import { type FixtureOptions } from '../../types.js'

/**
 * Options for `testPolicyFoModule` and `testPolicyForScript`
 *
 * @internal
 */
export type TestPolicyMacroOptions = ComposeOptions<
  [
    WithPolicyOverrideOnly,
    WithLog,
    {
      /**
       * Expected policy result
       */
      expected?: LavaMoatPolicy
    },
  ]
>

/**
 * Options bag containing `expected` policy or an expectation function
 *
 * @internal
 */
export type WithExpected<Context = unknown> = {
  /**
   * Expected policy or a function receiving the policy or an assertion
   * function.
   */
  expected?: LavaMoatPolicy | TestPolicyExpectationFn<Context>
}

/**
 * Options for the `testPolicyForFixture` macro
 *
 * @internal
 */
export type TestPolicyForFixtureOptions<Context = unknown> = ComposeOptions<
  [GeneratePolicyOptions, WithExpected<Context>, FixtureOptions]
>

/**
 * Options for the `testPolicyForJSON` macro
 *
 * @internal
 */
export type TestPolicyForJSONOptions<Context = unknown> = ComposeOptions<
  [
    Omit<GeneratePolicyOptions, 'readPowers' | 'policyOverridePath'>,
    WithExpected<Context>,
    {
      /**
       * Path to entrypoint _within the fixture_. This must be an absolute path
       * or URL.
       *
       * The default is `/index.js`.
       */

      jsonEntrypoint?: string | URL

      randomDelay?: boolean
    },
  ]
>

/**
 * Expectation function for {@link TestPolicyForJSONOptions}
 *
 * @internal
 */
export type TestPolicyExpectationFn<Context = unknown> = (
  t: ExecutionContext<Context>,
  policy: MergedLavaMoatPolicy
) => void | Promise<void>

/**
 * Return type of `scaffoldFixture` in `policy-macros.js`
 *
 * @internal
 */
export type ScaffoldFixtureResult = {
  vol: Volume
  readPowers: ReadNowPowers
}

/**
 * Options for `scaffoldFixture` in `policy-macros.js`
 *
 * @internal
 */
export type ScaffoldFixtureOptions = {
  /**
   * The type of fixture to generate
   *
   * @defaultValue 'module'
   */
  sourceType?: 'module' | 'script'
}
