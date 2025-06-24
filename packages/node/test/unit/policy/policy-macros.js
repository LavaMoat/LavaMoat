import '../../../src/preamble.js'

import { fileURLToPath } from 'node:url'
import { generatePolicy } from '../../../src/policy-gen/generate.js'
import { isPolicy } from '../../../src/policy-util.js'
import { isFunction } from '../../../src/util.js'
import {
  DEFAULT_JSON_FIXTURE_ENTRY_POINT,
  JSON_FIXTURE_DIR_URL,
  loadJSONFixture,
} from '../json-fixture-util.js'

/**
 * @import {ValueOf} from 'type-fest'
 * @import {TestPolicyMacroOptions, TestPolicyForJSONOptions, ScaffoldFixtureResult, ScaffoldFixtureOptions} from './types.js'
 * @import {GeneratePolicyOptions} from '../../../src/types.js'
 * @import {TestFn, MacroDeclarationOptions} from 'ava'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
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
   * Generic macro _declaration_ (not macro itself) for testing policy
   * generation against source code provided inline.
   *
   * Used only for macro composition
   *
   * @type {MacroDeclarationOptions<
   *   [
   *     content: string,
   *     opts: {
   *       expectedPolicy?: LavaMoatPolicy | TestPolicyMacroOptions
   *       sourceType?: InlineSourceType
   *     },
   *   ],
   *   Ctx
   * >}
   */
  const testInlinePolicyDeclaration = {
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
  const testPolicyForInlineModule = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     content: string,
     *     expectedPolicy?: LavaMoatPolicy | TestPolicyMacroOptions,
     *   ],
     *   Ctx
     * >}
     */
    ({
      exec: async (t, content, expectedPolicy) =>
        testInlinePolicyDeclaration.exec(t, content, {
          expectedPolicy,
          sourceType: InlineSourceTypes.Module,
        }),
      title: (title, content, expectedPolicy) =>
        testInlinePolicyDeclaration.title(title, content, {
          expectedPolicy,
          sourceType: InlineSourceTypes.Module,
        }),
    })
  )

  /**
   * Macro to test policy generation for inline CJS module content
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   */
  const testPolicyForInlineScript = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     content: string,
     *     expectedPolicy?: LavaMoatPolicy | TestPolicyMacroOptions,
     *   ],
     *   Ctx
     * >}
     */ ({
      exec: async (t, content, expectedPolicy) =>
        testInlinePolicyDeclaration.exec(t, content, {
          expectedPolicy,
          sourceType: InlineSourceTypes.Script,
        }),
      title: (title, content, expectedPolicy) =>
        testInlinePolicyDeclaration.title(title, content, {
          expectedPolicy,
          sourceType: InlineSourceTypes.Script,
        }),
    })
  )

  /**
   * Macro to test policy generation for a given JSON snapshot fixture.
   *
   * If `expectedPolicy` is provided, the actual policy is compared to it;
   * otherwise a snapshot is taken.
   *
   * @see {@link file://./../json-fixture/README.md}
   */
  const testPolicyForJSON = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     fixtureFilename: string,
     *     expectedPolicyOrOptions?: LavaMoatPolicy | TestPolicyForJSONOptions,
     *     options?: TestPolicyForJSONOptions,
     *   ],
     *   Ctx
     * >}
     */ ({
      exec: async (
        t,
        fixtureFilename,
        expectedPolicyOrOptions,
        options = {}
      ) => {
        /** @type {TestPolicyForJSONOptions['expected']} */
        let expected
        if (isPolicy(expectedPolicyOrOptions)) {
          expected = expectedPolicyOrOptions
        } else {
          options = /** @type {TestPolicyForJSONOptions} */ (
            expectedPolicyOrOptions ?? {}
          )
          ;({ expected, ...options } = options)
        }

        const { readPowers } = await loadJSONFixture(
          new URL(fixtureFilename, JSON_FIXTURE_DIR_URL)
        )

        const actualPolicy = await generatePolicy(
          options?.jsonEntrypoint ?? DEFAULT_JSON_FIXTURE_ENTRY_POINT,
          /** @type {GeneratePolicyOptions} */ ({
            ...options,
            readPowers,
          })
        )

        // if overrides provided, then we will make a second check that
        // asserts `actualPolicy` is a superset of the override
        t.plan(options?.policyOverride ? 2 : 1)

        if (isPolicy(expected)) {
          t.deepEqual(
            actualPolicy,
            expected,
            'policy does not deeply equal expected'
          )
        } else if (isFunction(expected)) {
          await expected(t, actualPolicy)
        } else {
          t.snapshot(actualPolicy, 'policy does not match snapshot')
        }

        if (options?.policyOverride) {
          t.like(
            actualPolicy,
            options.policyOverride,
            'policy is not a superset of overrides'
          )
        }
      },

      title: (
        title,
        fixtureFilename,
        expectedPolicyOrOptions,
        options = {}
      ) => {
        if (title) {
          return title
        }
        /** @type {TestPolicyForJSONOptions['expected']} */
        let expected
        if (isPolicy(expectedPolicyOrOptions)) {
          expected = expectedPolicyOrOptions
        } else {
          options = /** @type {TestPolicyForJSONOptions} */ (
            expectedPolicyOrOptions ?? {}
          )
          ;({ expected, ...options } = options)
        }

        if (isPolicy(expected)) {
          return `policy for fixture matches expected policy (${fixtureFilename})`
        } else if (isFunction(expected)) {
          return `policy for fixture passes assertions (${fixtureFilename})`
        } else {
          return `policy for fixture matches snapshot (${fixtureFilename})`
        }
      },
    })
  )

  return {
    testPolicyForJSON,
    testPolicyForModule: testPolicyForInlineModule,
    testPolicyForScript: testPolicyForInlineScript,
  }
}

/**
 * The entry point of a generated scaffold for inline sources
 *
 * This is always a POSIX path since it is only used in a virtual filesystem
 * (and we never need to use phony win32 paths).
 */
const SCAFFOLD_ENTRY_POINT = '/node_modules/test/index.js'

/**
 * Path to scaffold fixture for ESM
 */
const SCAFFOLD_MODULE_FIXTURE = fileURLToPath(
  new URL('./scaffold/scaffold-module.json', import.meta.url)
)

/**
 * Path to scaffold fixture for CJS
 */
const SCAFFOLD_SCRIPT_FIXTURE = fileURLToPath(
  new URL('./scaffold/scaffold-script.json', import.meta.url)
)

/**
 * Populates a fixture with `content` as the file content of the entry point of
 * a dependency.
 *
 * Used for testing policy generation against inline sources.
 *
 * - The entry point is _always_ {@link SCAFFOLD_ENTRY_POINT}
 * - The scaffold fixture is—depending on `options.sourceType`—
 *   [scaffold-module.json](./scaffold/scaffold-module.json) or
 *   [scaffold-script.json](./scaffold/scaffold-script.json)
 *
 * Works similarly to `lavamoat-core/test/util`'s `createConfigForTest`—except
 * `content` cannot be a function.
 *
 * @param {string} content Inline content
 * @param {ScaffoldFixtureOptions} [options] Options
 * @returns {Promise<ScaffoldFixtureResult>} `Volume` and associated read powers
 */

async function scaffoldFixture(content, { sourceType = 'module' } = {}) {
  const fixture =
    sourceType === 'module' ? SCAFFOLD_MODULE_FIXTURE : SCAFFOLD_SCRIPT_FIXTURE
  const { vol, readPowers } = await loadJSONFixture(
    new URL(fixture, import.meta.url)
  )

  await vol.promises.writeFile(SCAFFOLD_ENTRY_POINT, content, {
    encoding: 'utf8',
  })

  return { vol, readPowers }
}
