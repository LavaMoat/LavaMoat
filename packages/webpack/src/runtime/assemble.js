const { readFileSync } = require('node:fs')
const { parse } = require('@babel/parser')

/**
 * @param {string} source
 * @returns {string}
 */
function removeMultilineComments(source) {
  try {
    const ast = parse(source, { sourceType: 'script' })
    return (ast.comments || [])
      .filter((c) => c.type === 'CommentBlock')
      .reverse()
      .reduce(
        (src, { start, end }) => src.slice(0, start) + src.slice(end),
        source
      )
  } catch (e) {
    throw Error(
      `Failed to remove multiline comments. \n ${e} \n___________\n ${source}\n___________`
    )
  }
}
// Runtime modules are not being built nor wrapped by webpack, so I rolled my own tiny concatenator.
// It's using a shared namespace technique instead of scoping `exports` variables
// to avoid confusing anyone into believing it's actually CJS.
// Criticism will only be accepted in a form of working PR with less total lines and less magic.

/**
 * Loads the source code for a given module specifier.
 *
 * @param {string} specifier - The module specifier to load.
 * @returns {string} The loaded source code.
 */
function loadSource(specifier) {
  return readFileSync(require.resolve(specifier), 'utf-8')
}

/**
 * Wraps the source code for a given module in a function that simulates the
 * CommonJS module system.
 *
 * @param {string} sourceString - The source code to wrap.
 * @param {string} [name] - The name of the module.
 * @returns {string} The wrapped source code.
 */
function shimSource(sourceString, name = 'unknown') {
  return `;(()=>{
        const module = {exports: {}};
        const exports = module.exports;
          ${removeMultilineComments(sourceString)}
        ;
        LAVAMOAT['${name}'] = module.exports;
      })();`
}

/**
 * Prepares the source code for a given module specifier.
 *
 * @param {string} specifier - The module specifier to prepare.
 * @returns {string} The prepared source code.
 */
function prepareSource(specifier) {
  return removeMultilineComments(loadSource(specifier))
}

/**
 * @param {string} KEY
 * @param {RuntimeFragment[]} runtimeModules
 * @returns {string}
 */
const assembleRuntime = (KEY, runtimeModules) => {
  let assembly = 'const LAVAMOAT = Object.create(null);'
  runtimeModules.map(({ file, data, name, json, rawSource, shimRequire }) => {
    let sourceString
    if (file) {
      sourceString = readFileSync(file, 'utf-8')
    }
    if (rawSource) {
      sourceString = rawSource
    }
    if (data) {
      sourceString = JSON.stringify(data)
    }
    if (json) {
      sourceString = `LAVAMOAT['${name}'] = (${sourceString});`
    } else {
      if (shimRequire) {
        sourceString = loadSource(shimRequire)
      }
      if ((file || rawSource || shimRequire) && sourceString) {
        sourceString = shimSource(sourceString, name)
      }
    }
    if (sourceString) {
      assembly += `\n;/*${name}*/;\n${sourceString}`
    }
  })
  assembly += `;
  __webpack_require__.${KEY} = LAVAMOAT.defaultExport;
  (typeof harden !== 'undefined') && harden(__webpack_require__.${KEY});` // The harden line is likely unnecessary as the handler is being frozen anyway
  return assembly
}

/**
 * @typedef RuntimeFragment
 * @property {string} [file]
 * @property {unknown} [data]
 * @property {string} [name]
 * @property {boolean} [json]
 * @property {string} [rawSource]
 * @property {string} [shimRequire]
 */

module.exports = { assembleRuntime, prepareSource, removeMultilineComments }
