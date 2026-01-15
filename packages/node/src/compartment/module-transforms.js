/**
 * Provides {@link syncModuleTransforms}, which is a standard set of module
 * transforms provided to `@endo/compartment-mapper`.
 *
 * @packageDocumentation
 * @internal
 */

import { evadeCensorSync } from '@endo/evasive-transform'

const decoder = new TextDecoder()
const encoder = new TextEncoder()

const { URL } = globalThis

/**
 * @import {SyncModuleTransform, Language} from '@endo/compartment-mapper'
 */

/**
 * @param {string} _
 * @param {string} p1
 * @returns {string}
 */
const DIRECT_EVAL_REPLACE_FN = (_, p1) => '(0,eval)' + p1

/**
 * @param {string} source
 * @returns {string}
 */
const evadeDirectEvalExpressions = (source) => {
  return source.replace(/\beval(\s*\()/g, DIRECT_EVAL_REPLACE_FN)
}

/**
 * Hashbangs seem to offend SES.
 *
 * @param {string} source
 * @returns {string}
 */
const decapitateHashbang = (source) => {
  // careful with the source map
  return source.replace(/^#!(.+?)(?=\r?\n)/, '// $1')
}

/**
 * Evades SES restrictions on `import`+`(` in strings by replacing `(` with a
 * gremlin
 *
 * @remarks
 * TODO: Remove once Endo consumes "preserveFormat"
 * @param {string} source
 * @returns {string}
 */
const evadeImportString = (source) => {
  return source.replace(
    /(?<=[`"'][\w\d\s,.(){}!?@#$%^<>/\\-]*)import\(/g,
    'import（'
  )
}

const htmlCommentPattern = new RegExp(`(?:${'<'}!--|--${'>'})`, 'g')

/**
 * An optional transform to place ahead of `rejectHtmlComments` to evade _that_
 * rejection. However, it may change the meaning of the program.
 *
 * This evasion replaces each alleged html comment with the space-separated
 * JavaScript operator sequence that it may mean, assuming that it appears
 * outside of a comment or literal string, in source code where the JS parser
 * makes no special case for html comments (like module source code). In that
 * case, this evasion preserves the meaning of the program, though it does
 * change the souce column numbers on each effected line.
 *
 * If the html comment appeared in a literal (a string literal, regexp literal,
 * or a template literal), then this evasion will change the meaning of the
 * program by changing the text of that literal.
 *
 * If the html comment appeared in a JavaScript comment, then this evasion does
 * not change the meaning of the program because it only changes the contents of
 * those comments.
 *
 * @param {string} src
 * @returns {string}
 */
function evadeHtmlComment(src) {
  /**
   * @param {string} match
   * @returns {string}
   */
  const replaceFn = (match) => (match[0] === '<' ? '< ! --' : '-- >')
  return src.replace(htmlCommentPattern, replaceFn)
}

/**
 * Apply local transforms to source code
 *
 * @param {string} source
 * @returns {string}
 */
export const useLocalTransforms = (source) => {
  source = decapitateHashbang(source)
  // The following 3 transforms could be imported from core
  // import { applySourceTransforms } from 'lavamoat-core'
  // but the import trnsform in core is not making exceptions
  // for valid dynamic import() statements, and it seems like
  // we want those to remain.
  source = evadeHtmlComment(source)
  source = evadeDirectEvalExpressions(source)
  source = evadeImportString(source)

  return source
}

/**
 * Create a module transform which performs source transforms to evade SES
 * restrictions
 *
 * @param {Language} parser
 * @returns {SyncModuleTransform}
 */
const createModuleTransform = (parser) => {
  return (sourceBytes, specifier, location, _packageLocation, opts) => {
    let source = decoder.decode(sourceBytes)
    source = useLocalTransforms(source)
    const { code, map } = evadeCensorSync(source, {
      // elideComments: true, would clean up a lot
      sourceMap: opts?.sourceMap,
      sourceUrl: new URL(specifier, location).href,
      sourceType: parser === 'mjs' ? 'module' : 'script',
    })
    const objectBytes = encoder.encode(code)
    return { bytes: objectBytes, parser, map }
  }
}

/**
 * Standard set of module transforms for our purposes
 *
 * @internal
 */
export const syncModuleTransforms = /** @type {const} */ ({
  cjs: createModuleTransform('cjs'),
  mjs: createModuleTransform('mjs'),
})
