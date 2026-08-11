import { createConsola } from 'consola'
import { matchLevel } from './opinions-engine.js'

/**
 * @import {
 *   Decisions,
 *   Level,
 *   PrintApi
 * } from "./types.js"
 */

const consola = createConsola({
  fancy: true,
  formatOptions: {
    colors: true,
    date: false,
  },
})

/**
 * Creates a fallback decisions object that filters opinions by level.
 *
 * @param {object} options
 * @param {Level} options.level
 * @param {PrintApi} options.print
 * @param {string} [options.packageManager]
 * @returns {Decisions}
 */
export function createVerifier({ level, packageManager, print }) {
  let verified = true
  return {
    async packageManager() {
      if (!packageManager) {
        throw new Error(`packageManager must be provided to verifier`)
      }
      return packageManager
    },
    async shouldStart(scores, opinions) {
      // use scores and level to determine if there's any work left to do.
      for (const opinion of opinions) {
        if (!matchLevel(level, opinion.level)) {
          continue
        }
        if (opinion.detected === 1) {
          print(` ✔ ${opinion.id}`)
        } else {
          verified = false
          print(` ✖ ${opinion.id} [${100 * (opinion.detected ?? 0)}%]`)
        }
      }

      // print a box summary
      consola.box({
        title: 'Harden Defaults Verifier',
        message: `The current state of recommendations is:
${[...scores.entries()]
  .map(
    ([key, [applied, total]]) =>
      `  - ${key}: ${applied.toPrecision(1)} / ${total}`
  )
  .join('\n')}
        `,
        style: {
          padding: 1,
          borderColor: 'magenta',
          borderStyle: 'double-single-rounded',
        },
      })

      // don't run anything
      return false
    },
    async shouldApplyOpinion() {
      throw Error(`shouldApplyOpinion should not be called in verifier mode`)
    },
    async chooseOpinion() {
      throw Error(`chooseOpinion should not be called in verifier mode`)
    },
    async askToHarden() {
      throw Error(`askToHarden should not be called in verifier mode`)
    },
    async shouldFollowupCommand() {
      throw Error(`shouldFollowupCommand should not be called in verifier mode`)
    },
    async showSummary(_summary) {
      // no-op, we've displayed all we needed to display already.
      return { exitCode: verified ? 0 : 1 }
    },
  }
}
