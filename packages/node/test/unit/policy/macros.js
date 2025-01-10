import { generatePolicy } from '../../../src/policy-gen/generate.js'
import { isPolicy } from '../../../src/policy-util.js'
import { JSON_FIXTURE_DIR_URL, loadJSONFixture } from '../json-fixture-util.js'

/**
 * @import {ValueOf} from 'type-fest'
 * @import {TestPolicyMacroOptions, TestPolicyForJSONOptions} from './types.js'
 * @import {TestFn, MacroDeclarationOptions, ExecutionContext} from 'ava'
 * @import {LavaMoatPolicy, LavaMoatPolicyOverrides} from '@lavamoat/types'
 * @import {Volume} from 'memfs/lib/volume.js'
 * @import {ReadNowPowers} from '@endo/compartment-mapper'
 */

/**
 * Used by inner function in {@link createGeneratePolicyMacros} to determine
 * which scaffold to use
 *
 * @internal
 */
export const InlineSourceTypes = /** @type {const} */ ({
  Module: 'module',
  Script: 'script',
})

/**
 * Available inline source type
 *
 * @remarks
 * This typedef should stay here instead of in `types.ts` otherwise it would
 * create a cycle.
 * @typedef {ValueOf<typeof InlineSourceTypes>} InlineSourceType
 * @internal
 * @see {@link InlineSourceTypes}
 */

/**
 * Given an AVA test function, returns a set of macros for testing policy
 * generation using various types of fixtures.
 *
 * @remarks
 * People seem to dig being able to define sources inline, so here are some
 * macros to do it.
 * @template [Ctx=unknown] Custom execution context, if any. Default is
 *   `unknown`
 * @param {TestFn<Ctx>} test - AVA test function
 * @internal
 */
export function createGeneratePolicyMacros(test) {
  /**
   * Generic macro definition for testing policy generation.
   *
   * This is _not_ a macro; it's just the {@link MacroDeclarationOptions} object.
   *
   * @type {MacroDeclarationOptions<
   *   [
   *     content: string | Buffer,
   *     opts: {
   *       expectedPolicy?: LavaMoatPolicy | TestPolicyMacroOptions
   *       sourceType?: InlineSourceType
   *     },
   *   ],
   *   Ctx
   * >}
   */
  const testInlinePolicy = {
    exec: async (
      t,
      content,
      { expectedPolicy = {}, sourceType = InlineSourceTypes.Module } = {}
    ) => {
      const { readPowers } = await scaffoldFixture(content, { sourceType })

      const actualPolicy = await generatePolicy('/entry.js', {
        readPowers,
        policyOverride:
          'policyOverride' in expectedPolicy
            ? expectedPolicy.policyOverride
            : undefined,
      })

      if (isPolicy(expectedPolicy)) {
        t.deepEqual(actualPolicy, expectedPolicy)
      } else if ('expected' in expectedPolicy) {
        t.deepEqual(actualPolicy, expectedPolicy.expected)
      } else {
        t.snapshot(actualPolicy)
      }
    },
    title: (
      title,
      _content,
      { expectedPolicy = {}, sourceType = InlineSourceTypes.Module } = {}
    ) =>
      (isPolicy(expectedPolicy) || 'expected' in expectedPolicy
        ? `${title ?? `policy for inline ${sourceType} matches expected policy`}`
        : `${title ?? `policy for ${sourceType} fixture matches snapshot`}`
      ).trim(),
  }

  /**
   * Macro to test policy generation for inline ESM module content
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForInlineModule = test.macro({
    /**
     * @param {ExecutionContext<Ctx>} t
     * @param {string | Buffer} content
     * @param {LavaMoatPolicy | TestPolicyMacroOptions} [expectedPolicy]
     */
    exec: async (t, content, expectedPolicy) =>
      testInlinePolicy.exec(t, content, {
        expectedPolicy,
        sourceType: InlineSourceTypes.Module,
      }),
    title: (title, content, expectedPolicy) =>
      testInlinePolicy.title(title, content, {
        expectedPolicy,
        sourceType: InlineSourceTypes.Module,
      }),
  })

  /**
   * Macro to test policy generation for inline CJS module content
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForInlineScript = test.macro({
    /**
     * @param {ExecutionContext<Ctx>} t
     * @param {string | Buffer} content
     * @param {LavaMoatPolicy | TestPolicyMacroOptions} [expectedPolicy]
     */
    exec: async (t, content, expectedPolicy) =>
      testInlinePolicy.exec(t, content, {
        expectedPolicy,
        sourceType: InlineSourceTypes.Script,
      }),
    title: (title, content, expectedPolicy) =>
      testInlinePolicy.title(title, content, {
        expectedPolicy,
        sourceType: InlineSourceTypes.Script,
      }),
  })

  /**
   * Macro to test policy generation for a given {@link DirectoryJSON}- fixture
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForJSON = test.macro({
    /**
     * @param {ExecutionContext<Ctx>} t
     * @param {string} fixtureFilename
     * @param {LavaMoatPolicy | TestPolicyForJSONOptions} [expectedPolicyOrOptions]
     * @param {TestPolicyForJSONOptions} [options]
     * @returns {Promise<void>}
     */
    exec: async (t, fixtureFilename, expectedPolicyOrOptions, options = {}) => {
      /** @type {LavaMoatPolicy | undefined} */
      let expectedPolicy
      if (isPolicy(expectedPolicyOrOptions)) {
        expectedPolicy = expectedPolicyOrOptions
      } else {
        options = expectedPolicyOrOptions
      }
      const { readPowers } = await loadJSONFixture(
        new URL(fixtureFilename, JSON_FIXTURE_DIR_URL)
      )

      const actualPolicy = await generatePolicy('/index.js', {
        ...options,
        readPowers,
      })

      if (expectedPolicy) {
        t.deepEqual(actualPolicy, expectedPolicy)
      } else {
        t.snapshot(actualPolicy)
      }
    },
    title: (title, fixtureFilename, expectedPolicy) =>
      (expectedPolicy
        ? `${title ?? 'policy for fixture matches expected policy'}`
        : `${title ?? 'policy for fixture matches snapshot'}`
      ).trim() + ` (${fixtureFilename})`,
  })

  return {
    testPolicyForJSON,
    testPolicyForModule: testPolicyForInlineModule,
    testPolicyForScript: testPolicyForInlineScript,
  }
}

/**
 * Populates a fixture with `content` as the file content of the entry point of
 * a dependency.
 *
 * Works similarly to `lavamoat-core/test/util`'s `createConfigForTest`--except
 * `content` cannot be a function.
 *
 * @param {string | Buffer} content
 * @param {{ sourceType?: 'module' | 'script' }} [options]
 * @returns {Promise<{
 *   vol: Volume
 *   readPowers: ReadNowPowers
 * }>}
 */

async function scaffoldFixture(content, { sourceType = 'module' } = {}) {
  const fixture =
    sourceType === 'module'
      ? './scaffold/scaffold-module.json'
      : './scaffold/scaffold-script.json'
  const { vol, readPowers } = await loadJSONFixture(
    new URL(fixture, import.meta.url)
  )

  vol.fromJSON({ '/node_modules/test/index.js': content })

  return { vol, readPowers }
}
