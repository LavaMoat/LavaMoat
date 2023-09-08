// @ts-check
const diag = require('./diagnostics')

/**
 * @typedef {object} ProgressAPI
 * @property {(expectedStep: string) => boolean} is - checks if current progress matches expectedStep
 * @property {(expectedStep: string) => boolean} done - checks if expectedStep was already reported.
 * @property {(expectedStep: string) => void} assertDone - throws if expectedStep was not already reported.
 * @property {(step: string) => void} report - moves progress forward if step passed is the next step. no-op if current step (reporting progress is idempotent)
 */

/**
 * Monitors progress along a linear sequence of steps.
 *
 * @param {object} options
 * @param {string[]} options.steps
 * @returns {ProgressAPI}
 */
module.exports = function progress({ steps }) {
  const canRepeat = new Set()

  steps = steps.map((step) => {
    const [st, info] = step.split(':')
    if (info === 'repeats') {
      canRepeat.add(st)
    }
    return st
  })
  let currentStep = 0
  const done = new Set()

  const API = {}

  API.report = (step) => {
    if (canRepeat.has(step) && steps[currentStep] === step) {
      diag.rawDebug(2, `\n> Reporting ${step} again`)
      return
    }
    done.add(step)
    if (steps[currentStep + 1] !== step) {
      throw Error(
        `ScorchWrap Plugin: Progress reported '${step}' but the next step was expected to be '${
          steps[currentStep + 1]
        }'`,
      )
    } else {
      diag.rawDebug(1, `\n> progress ${steps[currentStep]}->${step}`)
      currentStep += 1
    }
  }
  API.is = (query) => {
    const current = steps[currentStep]
    diag.rawDebug(2, `\n> Checking (${current}).is(${query})`)
    return current === query
  }
  API.done = (query) => {
    return done.has(query)
  }
  API.assertDone = (query) => {
    if (done.has(query)) {
      return
    }
    throw Error(
      `ScorchWrap Plugin: Expected '${query}' to be done, but we're at '${steps[currentStep]}'`,
    )
  }
  return API
}
