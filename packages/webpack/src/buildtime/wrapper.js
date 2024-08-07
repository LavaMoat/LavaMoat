const { applySourceTransforms } = require('lavamoat-core')
const diag = require('./diagnostics')
const fs = require('node:fs')
const q = JSON.stringify

/**
 * @typedef {object} WrappingInput
 * @property {string} source
 * @property {string} id
 * @property {string[] | Set<string>} runtimeKit
 * @property {string} evalKitFunctionName
 * @property {boolean} [runChecks]
 */

const {
  NAME_globalThis,
  NAME_scopeTerminator,
  NAME_runtimeHandler,
} = require('../ENUM.json')

/**
 * @param {WrappingInput} params
 * @returns {{
 *   before: string
 *   after: string
 *   source: string
 *   sourceChanged: boolean
 * }}
 */
exports.wrapper = function wrapper({
  source,
  id,
  runtimeKit,
  evalKitFunctionName,
  runChecks = true,
}) {
  // validateSource(source);

  // No AST used in these transforms, so string cmparison should indicate if anything was changed.
  const sesCompatibleSource = applySourceTransforms(source)
  const sourceChanged = source !== sesCompatibleSource

  // TODO: Consider: We could save some bytes by merging scopeTerminator and runtimeHandler, but then runtime calls would go through a proxy, which is slower. Merging runtimeKit with globalThis would also be problematic.

  // return NO-OP if runtime didn't produce a scope terminator
  const before = `(function(){
     if (!this.${NAME_scopeTerminator}) return ()=>{};
     with (this.${NAME_scopeTerminator}) {
      with (this.${NAME_runtimeHandler}) {
      with (this.${NAME_globalThis}) {
        return function() { 'use strict';
`

  const after = `
        };
      }
    }
    }
}).call(${evalKitFunctionName}(${q(id)}, { ${Array.from(runtimeKit).join(
    ','
  )}}))()`
  if (runChecks) {
    validateSource(before + sesCompatibleSource + after)
  }
  return {
    before,
    after,
    source: sesCompatibleSource,
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
  // If wrapping results with invalid JS, webpack may not report that at later stages
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
