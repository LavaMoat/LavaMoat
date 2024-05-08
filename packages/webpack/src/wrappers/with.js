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
  const compatibleSource = applySourceTransforms(source)

  // TODO: Consider: We could save some bytes by merging scopeTerminator and runtimeHandler, but then runtime calls would go through a proxy, which is slower. Merging runtimeKit with globalThis would also be problematic.

  // return NO-OP if runtime didn't produce a scope terminator
  const before = `(function(){
    if (!this.${NAME_scopeTerminator}) return ()=>{};
  //  console.log(this.${NAME_globalThis})

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
  return {
    before,
    after,
    compatibleSource,
  }
}

exports.wrapperInit = `(o)=>{ lockdown(o) }`
