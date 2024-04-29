const diag = require('./diagnostics')
const fs = require('node:fs')

/**
 * @typedef {object} WrappingParams
 * @property {import('../types').WrapperImplementationu} wrapperImplementation
 * @property {string} source
 * @property {string} id
 * @property {string[] | Set<string>} runtimeKit
 * @property {string} evalKitFunctionName
 * @property {boolean} [runChecks]
 */

/**
 * @param {WrappingParams} params
 * @returns {{
 *   before: string
 *   after: string
 *   source: string
 *   sourceChanged: boolean
 * }}
 */
exports.wrapper = function wrapper({
  wrapperImplementation,
  source,
  id,
  runtimeKit,
  evalKitFunctionName,
  runChecks = true,
}) {
  // validateSource(source);

  const { before, compatibleSource, after } = wrapperImplementation({
    source,
    id,
    runtimeKit,
    evalKitFunctionName,
  })
  const sourceChanged = source !== compatibleSource

  if (runChecks) {
    validateSource(before + compatibleSource + after)
  }
  return {
    before,
    after,
    source: compatibleSource,
    sourceChanged,
  }
}

/**
 * Validates the source by creating a Function from it
 *
 * @param {string} source
 */
function validateSource(source) {
  const validityFlag = 'E_VALIDATION' + Math.random().toFixed(10)
  // If wrappingParams results with invalid JS, webpack may not report that at later stages
  // or we might get an error complaining about with in strict mode even if the issue is mismatching curlies
  try {
    // This used to be
    // Function(`{throw "${validityFlag}"};;` + source)()
    // but function constructor should suffice to report parsing errors
    Function(source)
  } catch (e) {
    diag.run(1, () => {
      fs.writeFileSync(
        validityFlag + '.js',
        source +
          `
/*
${e}
*/
        `
      )
    })
    throw Error(validityFlag + 'wrapped module is not valid JS\n' + e)
  }
}
