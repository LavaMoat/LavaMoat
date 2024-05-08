// @ts-expect-error - missing types
const { applySourceTransforms } = require('lavamoat-core')

const q = JSON.stringify

const {
  NAME_globalThis,
  NAME_scopeTerminator,
  NAME_runtimeHandler,
  NAME_wrapperContext,
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
  // TODO: finction constructor explores if names in first argument overlap with names in second argument, so runtimeHandler keys cannot match any globals. I don't want to introduce code to dynamically subset that here
  const before = `(function(){
    if (!this.${NAME_scopeTerminator}) return ()=>{};
    const {F:FERAL_FUNCTION, k} = this.${NAME_wrapperContext};
    const $k = [...new Set([...k(globalThis), ...k(this.${NAME_globalThis})])];
    return new FERAL_FUNCTION(
      '{' + $k + '}','{'+k(this.${NAME_runtimeHandler})+'}',
      String.raw\`;(function(){"use strict";
`

  const after = `
       })()\`).bind(null,this.${NAME_globalThis}, this.${NAME_runtimeHandler})
}).call(${evalKitFunctionName}(${q(id)}, { ${runtimeKitKeys} }))()`
  return {
    before,
    compatibleSource,
    after,
  }
}

// This wrapping method is not blocking creating a new global later, so we must prevent it with a freeze right after lockdown
exports.wrapperInit = `(o)=>{
  const FERAL_FUNCTION = Function;
  // Object.preventExtensions(globalThis); // this seems to not work in any engine other than Hermes
  lockdown(o);
  return {
    F:FERAL_FUNCTION,
    k:Object.getOwnPropertyNames
  }
}`
