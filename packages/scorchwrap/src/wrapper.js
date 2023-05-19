const { applySourceTransforms } = require("lavamoat-core");
const diag = require("./diagnostics");
const fs = require("fs");
const q = JSON.stringify;

/**
 * @typedef {object} WrappingInput
 * @property {string} source
 * @property {string} id
 * @property {string[] | Set<string>} runtimeKit
 * @property {string} evalKitFunctionName
 * @property {boolean} [runChecks]
 *
 */

const NAME_globalThis = 'G';
const NAME_scopeTerminator = 'ST';
const NAME_runtimeHandler = 'RH';


/**
 *
 * @param {WrappingInput} params
 * @returns {string}
 */
exports.wrapSource = function wrapSource(options) {
  const { before, after, source } = wrapper(options);
  return `${before}${source}${after}`;
};

/**
 *
 * @param {WrappingInput} params
 * @returns {{before: string, after: string, source: string, sourceChanged: boolean}}
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
  const sesCompatibleSource = applySourceTransforms(source);
  const sourceChanged = source !== sesCompatibleSource;

  // TODO: Consider: We could save some bytes by merging scopeTerminator and runtimeHandler, but then runtime calls would go through a proxy, which is slower. Merging runtimeKit with globalThis would also be problematic.
  const before = `(function(){
     with (this.${NAME_scopeTerminator}) {
      with (this.${NAME_runtimeHandler}) {
      with (this.${NAME_globalThis}) {
        return function() { 'use strict';
`;

  const after = `
        };
      }
    }
    }
}).call(${evalKitFunctionName}(${q(id)}, { ${Array.from(
    runtimeKit
  ).join(",")}}))()`;
  if (runChecks) {
    validateSource(before + sesCompatibleSource + after);
  }
  return {
    before,
    after,
    source: sesCompatibleSource,
    sourceChanged,
  };
};

function validateSource(source) {
  const validityFlag = "E_VALIDATION" + Math.random().toFixed(10);
  // If wrapping results with invalid JS, webpack may not report that at later stages
  // or we might get an error complaoining about with in strict mode even if the issue is mismatching curlies
  try {
    Function(`{throw "${validityFlag}"};;` + source)();
  } catch (e) {
    if (e !== validityFlag) {
      diag.run(1, () => {
        fs.writeFileSync(validityFlag + ".js", source+`
/*
${e}
*/
        `);
      });
      throw Error(validityFlag + "wrapped module is not valid JS\n" + e);
    }
  }
}
