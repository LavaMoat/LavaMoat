const diag = require('./diagnostics')

/**
 * @typedef {object} ProgressAPI
 * @property {(expectedStep: string) => boolean} is - Checks if current progress
 *   matches expectedStep
 * @property {(expectedStep: string) => boolean} done - Checks if expectedStep
 *   was already reported.
 * @property {(expectedStep: string) => void} assertDone - Reports an error if
 *   expectedStep was not already reported.
 * @property {(step: string) => void} report - Moves progress forward if step
 *   passed is the next step. no-op if current step (reporting progress is
 *   idempotent)
 * @property {(errors: Error[]) => void} reportErrorsTo - Wire up the array to
 *   push errors to for compilation. Pass compilation.errors to it as soon as
 *   possible.
 */

/**
 * Monitors progress along a linear sequence of steps.
 *
 * @param {object} options
 * @param {string[]} options.steps
 * @returns {ProgressAPI}
 */
module.exports = function progress({ steps }) {
  /** @type {Error[]} */
  let compilationErrors = []
  /**
   * @param {Error} e
   */
  const reportError = (e) => {
    compilationErrors.push(e)
  }
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

  /**
   * Reports progress for the given step.
   *
   * @param {string} step - The step to report progress for.
   */
  API.report = (step) => {
    if (canRepeat.has(step) && steps[currentStep] === step) {
      diag.rawDebug(3, `\n> Reporting ${step} again`)
      return
    }
    done.add(step)
    if (steps[currentStep + 1] !== step) {
      reportError(
        Error(
          `LavaMoatPlugin: Progress reported '${step}' but the next step was expected to be '${
            steps[currentStep + 1]
          }'`
        )
      )
    } else {
      diag.rawDebug(1, `\n> progress ${steps[currentStep]}->${step}`)
      currentStep += 1
    }
  }
  /**
   * @param {string} query - Step name
   */
  API.is = (query) => {
    const current = steps[currentStep]
    diag.rawDebug(2, `\n> Checking (${current}).is(${query})`)
    return current === query
  }
  API.get = () => {
    return steps[currentStep]
  }
  /**
   * @param {string} query - Step name
   */
  API.done = (query) => {
    return done.has(query)
  }
  /**
   * @param {string} query - Step name
   */
  API.assertDone = (query) => {
    if (done.has(query)) {
      return
    }
    reportError(
      Error(
        `LavaMoatPlugin: Expected '${query}' to be done, but we're at '${steps[currentStep]}'`
      )
    )
  }
  /**
   * @param {Error[]} errors
   */
  API.reportErrorsTo = (errors) => {
    errors.push(...compilationErrors)
    compilationErrors = errors
  }
  return API
}
