/**
 * @import {TestFn, MacroDeclarationOptions} from 'ava'
 * @import {LavaMoatPolicy} from '@lavamoat/types'
 */

import { run } from '../../src/exec/run.js'
import {
  JSON_FIXTURE_DIR_URL,
  JSON_FIXTURE_ENTRY_POINT,
  loadJSONFixture,
} from './json-fixture-util.js'

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
     *   [fixtureFilename: string, policy: LavaMoatPolicy, expected: unknown]
     * >}
     */ ({
      exec: async (t, fixtureFilename, policy, expected) => {
        const { readPowers } = await loadJSONFixture(
          new URL(fixtureFilename, JSON_FIXTURE_DIR_URL)
        )
        const result = await run(JSON_FIXTURE_ENTRY_POINT, policy, {
          readPowers,
        })
        t.deepEqual({ .../** @type {any} */ (result) }, expected)
      },
      title: (title) =>
        title ?? `program output matches expected (${genericTitleIndex++}`,
    })
  )

  const testExec = test.macro(
    /**
     * @type {MacroDeclarationOptions<
     *   [entry: string | URL, policy: LavaMoatPolicy, expected: unknown]
     * >}
     */ ({
      exec: async (t, entryFile, policy, expected) => {
        const result = await run(entryFile, policy)
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
