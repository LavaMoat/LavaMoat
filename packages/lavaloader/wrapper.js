const { applySourceTransforms } = require("lavamoat-core");
const q = JSON.stringify;

/**
 *
 * @param {object} params
 * @param {string} params.source
 * @param {string} params.id
 * @param {string[]} params.runtimeKit
 * @param {boolean} [params.runChecks]
 * @returns
 */
module.exports = function wrapper({
  source,
  id,
  runtimeKit,
  runChecks = true,
}) {
  // validateSource(source);

  const sesCompatibleSource = applySourceTransforms(source);
  const wrappedSrc = `(function(){
    with (this.scopeTerminator) {
      with (this.runtimeHandler) {
      with (this.globalThis) {
        return function() { 'use strict';
      ${sesCompatibleSource}
        };
      }
    }
    }
}).call(getLavaMoatEvalKitForCompartment(${q(id)}, { ${runtimeKit.join(
    ","
  )}}))()`;
  if (runChecks) {
    validateSource(wrappedSrc);
  }
  return wrappedSrc;
};

function validateSource(source) {
  const validityFlag = "validityFlag" + Math.random().toFixed(10);
  // If the result is not valid javascript, instead of a parse error,
  // we'll get webpack complaining that `with` is used in strict mode.
  // To prevent that confusion, let's check that the result is valid javascript.
  try {
    eval(`{throw "${validityFlag}"};;` + source);
  } catch (e) {
    if (e !== validityFlag) {
      throw Error("wrapped module is not valid JS\n" + e);
    }
  }
}
