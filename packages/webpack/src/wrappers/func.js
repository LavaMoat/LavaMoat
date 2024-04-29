// @ts-expect-error - missing types
const { applySourceTransforms } = require('lavamoat-core')

const q = JSON.stringify

const {
  NAME_globalThis,
  NAME_scopeTerminator,
  NAME_runtimeHandler,
} = require('../ENUM.json')

/**
 * @type {import('../types.js').WrapperImplementation}
 */
exports.wrap = function wrap({ source, id, runtimeKit, evalKitFunctionName }) {
  // No AST used in these transforms, so string cmparison should indicate if anything was changed.
  const compatibleSource = applySourceTransforms(source).replace(
    /`|\${/g,
    "$${'$&'}"
  )

  const runtimeKitKeys = Array.from(runtimeKit).join(',')
  // return NO-OP if runtime didn't produce a scope terminator
  const before = `(function(){
    if (!this.${NAME_scopeTerminator}) return ()=>{};
    const k = Object.keys;
    const $sc = {...this.${NAME_runtimeHandler}, ...this.${NAME_globalThis}};
    const $k = [...new Set(['FERAL_FUNCTION',...k(globalThis), ...${q(Array.from(runtimeKit))}, ...k($sc)])];
    return new FERAL_FUNCTION(
      '{' + $k + '}',
      String.raw\`;(function(){"use strict"; 
`

  const after = `
       })()\`).bind(null,$sc)
}).call(${evalKitFunctionName}(${q(id)}, { ${runtimeKitKeys} }))()`
  return {
    before,
    compatibleSource,
    after,
  }
}

// This wrapping method is not blocking creating a new global later, so we must prevent it with a freeze right after lockdown
exports.wrapperInit = `(o)=>{
  globalThis.FERAL_FUNCTION = Function;
  // Object.preventExtensions(globalThis); // this seems to not work in any engine other than Hermes
  lockdown(o);
}`
