import '../../../src/preamble.js'

import chalk from 'chalk'
import { run } from '../../../src/exec/run.js'
import {
  DEFAULT_JSON_FIXTURE_ENTRY_POINT,
  JSON_FIXTURE_DIR_URL,
  loadJSONFixture,
} from '../json-fixture-util.js'

/**
 * @import {TestFn, MacroDeclarationOptions} from 'ava'
 * @import {LavaMoatPolicy} from 'lavamoat-core'
 * @import {TestExecForJSONMacroOptions, TestExecMacroOptions} from '../../types.js'
 */

/**
 * @satisfies {LavaMoatPolicy}
 */
const DEFAULT_POLICY = Object.freeze({
  resources: {},
})

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
export const createExecMacros = (test) => {
  /**
   * Unique index for generic test titles (to avoid test title collisions)
   */
  let genericTitleIndex = 0

  const testExecForJSON = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     fixtureFilename: string,
     *     expected: unknown,
     *     options?: TestExecForJSONMacroOptions,
     *   ]
     * >}
     */ ({
      exec: async (
        t,
        fixtureFilename,
        expected,
        {
          policy = DEFAULT_POLICY,
          jsonEntrypoint = DEFAULT_JSON_FIXTURE_ENTRY_POINT,
        } = {}
      ) => {
        const { readPowers, vol } = await loadJSONFixture(
          new URL(fixtureFilename, JSON_FIXTURE_DIR_URL)
        )
        try {
          const result = await run(jsonEntrypoint, { policy, readPowers })
          t.deepEqual(
            { .../** @type {any} */ (result) },
            expected,
            'program output did not match expected value'
          )
        } catch (err) {
          t.log(`Volume tree:\n${chalk.yellow(vol.toTree())}`)
          throw err
        }
      },
      title: (title) =>
        title ?? `program output matches expected (${genericTitleIndex++}`,
    })
  )

  const testExec = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [
     *     entrypoint: string | URL,
     *     expected: unknown,
     *     options?: TestExecMacroOptions,
     *   ]
     * >}
     */ ({
      exec: async (
        t,
        entrypoint,
        expected,
        { policy = DEFAULT_POLICY } = {}
      ) => {
        const result = await run(entrypoint, { policy })
        t.deepEqual({ .../** @type {any} */ (result) }, expected)
      },
      title: (title) =>
        title ?? `program output matches expected (${genericTitleIndex++}`,
    })
  )

  return {
    testExecForJSON,
    testExec,
  }
}
