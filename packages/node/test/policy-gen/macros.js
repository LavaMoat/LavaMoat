import { generatePolicy } from '../../src/policy-gen/index.js'
import { isPolicy } from '../../src/policy.js'
import { loadJSONFixture, scaffoldFixture } from '../fixture-util.js'

/**
 * Path to `DirectoryJSON` fixtures.
 *
 * @remarks
 * The trailing slash is load-bearing.
 * @internal
 */
const JSON_FIXTURE_DIR = new URL('../fixture/json/', import.meta.url)

/**
 * Used by inner function in {@link createGeneratePolicyMacros} to determine
 * which scaffold to use
 *
 * @internal
 */
const InlineSourceTypes = /** @type {const} */ ({
  Module: 'module',
  Script: 'script',
})

/**
 * @typedef {import('type-fest').ValueOf<InlineSourceTypes>} InlineSourceType
 */

/**
 * @typedef {import('type-fest').Except<
 *   import('../../src/types.js').GeneratePolicyOptions,
 *   'readPowers'
 * >} TestPolicyForJSONOptions
 */

/**
 * Given an AVA test function, returns a set of macros for testing policy
 * generation in various contexts
 *
 * @template [Ctx=unknown] Custom execution context, if any. Default is
 *   `unknown`
 * @param {import('ava').TestFn<Ctx>} test - AVA test function
 */
export function createGeneratePolicyMacros(test) {
  /**
   * @type {import('ava').MacroDeclarationOptions<
   *   [
   *     content: string | Buffer,
   *     opts?: {
   *       expectedPolicy?: import('lavamoat-core').LavaMoatPolicy
   *       sourceType?: InlineSourceType
   *     },
   *   ],
   *   Ctx
   * >}
   * @internal
   */
  const testInlinePolicy = {
    exec: async (
      t,
      content,
      { expectedPolicy, sourceType = InlineSourceTypes.Module } = {}
    ) => {
      const { readPowers } = await scaffoldFixture(content, { sourceType })
      const actualPolicy = await generatePolicy('/entry.js', {
        readPowers,
      })
      if (expectedPolicy) {
        t.deepEqual(actualPolicy, expectedPolicy)
      } else {
        t.snapshot(actualPolicy)
      }
    },
    title: (
      title,
      content,
      { expectedPolicy, sourceType = InlineSourceTypes.Module } = {}
    ) => {
      return (
        expectedPolicy
          ? `${title ?? 'policy for inline ' + sourceType + ' matches expected policy'}`
          : `${title ?? 'policy for ' + sourceType + ' fixture matches snapshot'}`
      ).trim()
    },
  }

  /**
   * Test policy generation for ESM module content provided inline.
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForInlineModule = test.macro({
    /**
     * @param {import('ava').ExecutionContext<Ctx>} t
     * @param {string | Buffer} content
     * @param {import('lavamoat-core').LavaMoatPolicy} [expectedPolicy]
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
   * Test policy generation for ESM module content
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForInlineScript = test.macro({
    /**
     * @param {import('ava').ExecutionContext<Ctx>} t
     * @param {string | Buffer} content
     * @param {import('lavamoat-core').LavaMoatPolicy} [expectedPolicy]
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
   * Test policy generation for a given DirectoryJSON fixture
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForJSON = test.macro({
    /**
     * @param {import('ava').ExecutionContext<Ctx>} t
     * @param {string} fixtureFilename
     * @param {import('lavamoat-core').LavaMoatPolicy
     *   | TestPolicyForJSONOptions} [expectedPolicyOrOptions]
     * @param {TestPolicyForJSONOptions} [options]
     * @returns {Promise<void>}
     */
    exec: async (t, fixtureFilename, expectedPolicyOrOptions, options = {}) => {
      /** @type {import('lavamoat-core').LavaMoatPolicy | undefined} */
      let expectedPolicy
      if (isPolicy(expectedPolicyOrOptions)) {
        expectedPolicy = expectedPolicyOrOptions
      } else {
        options = expectedPolicyOrOptions
      }
      const { readPowers } = await loadJSONFixture(
        new URL(fixtureFilename, JSON_FIXTURE_DIR)
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
