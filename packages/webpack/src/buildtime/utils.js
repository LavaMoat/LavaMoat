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
 * @property {() => void} cancel - Cancels the progress monitoring.
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
function progress({ steps }) {
  let cancelled = false
  /** @type {Error[]} */
  let compilationErrors = []
  /**
   * @param {Error} e
   */
  const reportError = (e) => {
    if (!cancelled) {
      compilationErrors.push(e)
    }
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
      diag.rawDebug(4, `  progress  Reporting ${step} again`)
      return
    }
    done.add(step)
    if (steps[currentStep + 1] !== step) {
      reportError(
        Error(
          `LavaMoatPlugin: Progress reported '${step}' but the next step was expected to be '${steps[currentStep + 1]
          }'`
        )
      )
    } else {
      diag.rawDebug(2, `  progress  ${steps[currentStep]}->${step}`)
      currentStep += 1
    }
  }
  /**
   * @param {string} query - Step name
   */
  API.is = (query) => {
    const current = steps[currentStep]
    diag.rawDebug(3, `  progress  Checking (${current}).is(${query})`)
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

  API.cancel = () => {
    cancelled = true
    diag.rawDebug(2, `  progress: build cancelled`)
  }
  diag.rawDebug(2, `  progress  ${steps[currentStep]}`)

  return API
}

/**
 * @template T
 * @template {keyof T} K
 * @typedef {T & Required<Pick<T, K>>} RequireFields
 */

/**
 * @template {Record<string, any>} T
 * @template {keyof T} K
 * @param {T} storeObj
 * @param {readonly K[]} fields
 * @returns {asserts storeObj is RequireFields<T, K>}
 */
const assertFields = (storeObj, fields) => {
  const missingFields = fields.filter((field) => storeObj[field] === undefined)

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

module.exports = {
  assertFields,
  progress,
}
