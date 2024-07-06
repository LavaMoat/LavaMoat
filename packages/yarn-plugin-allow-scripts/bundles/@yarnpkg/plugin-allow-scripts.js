/* eslint-disable */
//prettier-ignore
module.exports = {
name: "@yarnpkg/plugin-allow-scripts",
factory: function (require) {
var plugin=(()=>{var n=Object.defineProperty;var e=Object.getOwnPropertyDescriptor;var s=Object.getOwnPropertyNames;var u=Object.prototype.hasOwnProperty;var f=(t=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(t,{get:(o,l)=>(typeof require<"u"?require:o)[l]}):t)(function(t){if(typeof require<"u")return require.apply(this,arguments);throw new Error('Dynamic require of "'+t+'" is not supported')});var c=(t,o)=>{for(var l in o)n(t,l,{get:o[l],enumerable:!0})},g=(t,o,l,a)=>{if(o&&typeof o=="object"||typeof o=="function")for(let r of s(o))!u.call(t,r)&&r!==l&&n(t,r,{get:()=>o[r],enumerable:!(a=e(o,r))||a.enumerable});return t};var p=t=>g(n({},"__esModule",{value:!0}),t);var w={};c(w,{default:()=>d});var i=f("@yarnpkg/cli"),m={hooks:{afterAllInstalled:async()=>{let{defaultContext:t}=await(0,i.getCli)();console.error("Foo",JSON.stringify(t)),await(0,i.runExit)(["run","allow-scripts"],t)}}},d=m;return p(w);})();
return plugin;
}
};
