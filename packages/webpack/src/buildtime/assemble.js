const { readFileSync } = require('node:fs')

function removeMultilineComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '')
}

// Runtime modules are not being built nor wrapped by webpack, so I rolled my own tiny concatenator.
// It's using a shared namespace technique instead of scoping `exports` variables
// to avoid confusing anyone into believing it's actually CJS.
// Criticism will only be accepted in a form of working PR with less total lines and less magic.
const assembleRuntime = (KEY, runtimeModules) => {
  let assembly = 'const LAVAMOAT = Object.create(null);'
  runtimeModules.map(({ file, data, name, json, shimRequire, rawSource }) => {
    let sourceString
    if (file) {
      sourceString = readFileSync(file, 'utf-8')
      sourceString = removeMultilineComments(sourceString)
    }
    if (data) {
      sourceString = JSON.stringify(data)
    }
    if (json) {
      sourceString = `LAVAMOAT['${name}'] = (${sourceString});`
    }
    if (shimRequire) {
      sourceString = readFileSync(require.resolve(shimRequire), 'utf-8')
      sourceString = removeMultilineComments(sourceString)
      sourceString = `;(()=>{
        const module = {exports: {}};
        const exports = module.exports;
          ${sourceString}
        ;
        LAVAMOAT['${name}'] = module.exports;
      })();`
    }
    if (rawSource) {
      sourceString = `LAVAMOAT['${name}'] = ${rawSource};`
    }
    assembly += `\n;/*${name}*/;\n${sourceString}`
  })
  assembly += `;
  __webpack_require__.${KEY} = LAVAMOAT.defaultExport;
  (typeof harden !== 'undefined') && harden(__webpack_require__.${KEY});` // The harden line is likely unnecessary as the handler is being frozen anyway
  return assembly
}

module.exports = { assembleRuntime }
