const q = JSON.stringify;

/**
 * 
 * @param {object} params
 * @param {string} params.source
 * @param {string} params.id
 * @param {string[]} params.runtimeKit 
 * @returns 
 */
module.exports = function wrapper({ source, id, runtimeKit }) {
  const wrappedSrc = `(function(){
    with (this.scopeTerminator) {
      with (this.runtimeHandler) {
      with (this.globalThis) {
        return function() { 'use strict';
      ${source}
        };
      }
    }
    }
}).call(getLavaMoatEvalKitForCompartment(${q(id)}, { ${runtimeKit.join(
    ","
  )}}))()`;

  const validityFlag = "validityFlag" + Math.random().toFixed(10);
  // If the result is not valid javascript, instead of a parse error,
  // we'll get webpack complaining that `with` is used in strict mode.
  // To prevent that confusion, let's check that the result is valid javascript.
  try {
    eval(`{throw "${validityFlag}"};;` + wrappedSrc);
  } catch (e) {
    if (e !== validityFlag) {
      throw Error("wrapped module is not valid JS\n" + e);
    }
  }

  return wrappedSrc;
};
