(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SesTransforms = {}));
}(this, (function (exports) { 'use strict';

  /**
   * commons.js
   * Declare shorthand functions. Sharing these declarations across modules
   * improves on consistency and minification. Unused declarations are
   * dropped by the tree shaking process.
   *
   * We capture these, not just for brevity, but for security. If any code
   * modifies Object to change what 'assign' points to, the Compartment shim
   * would be corrupted.
   */

  const {
    assign,
    create,
    defineProperties,
    entries,
    freeze,
    getOwnPropertyDescriptor,
    getOwnPropertyDescriptors,
    getOwnPropertyNames,
    getPrototypeOf,
    is,
    isExtensible,
    keys,
    prototype: objectPrototype,
    seal,
    setPrototypeOf,
    values,
  } = Object;

  const { apply, construct, get: reflectGet, set: reflectSet } = Reflect;

  const { isArray, prototype: arrayPrototype } = Array;
  const { prototype: regexpPrototype } = RegExp;
  const { prototype: stringPrototype } = String;
  const { prototype: weakmapPrototype } = WeakMap;

  /**
   * uncurryThis()
   * This form of uncurry uses Reflect.apply()
   *
   * The original uncurry uses:
   * const bind = Function.prototype.bind;
   * const uncurryThis = bind.bind(bind.call);
   *
   * See those reference for a complete explanation:
   * http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   * which only lives at
   * http://web.archive.org/web/20160805225710/http://wiki.ecmascript.org/doku.php?id=conventions:safe_meta_programming
   *
   * @param {(thisArg: Object, ...args: any[]) => any} fn
   */
  const uncurryThis = fn => (thisArg, ...args) => apply(fn, thisArg, args);

  const objectHasOwnProperty = uncurryThis(objectPrototype.hasOwnProperty);
  //
  const arrayFilter = uncurryThis(arrayPrototype.filter);
  const arrayJoin = uncurryThis(arrayPrototype.join);
  const arrayPush = uncurryThis(arrayPrototype.push);
  const arrayPop = uncurryThis(arrayPrototype.pop);
  const arrayIncludes = uncurryThis(arrayPrototype.includes);
  //
  const regexpTest = uncurryThis(regexpPrototype.test);
  //
  const stringMatch = uncurryThis(stringPrototype.match);
  const stringSearch = uncurryThis(stringPrototype.search);
  const stringSlice = uncurryThis(stringPrototype.slice);
  const stringSplit = uncurryThis(stringPrototype.split);
  //
  const weakmapGet = uncurryThis(weakmapPrototype.get);
  const weakmapSet = uncurryThis(weakmapPrototype.set);
  const weakmapHas = uncurryThis(weakmapPrototype.has);

  /**
   * immutableObject
   * An immutable (frozen) exotic object and is safe to share.
   */
  const immutableObject = freeze({ __proto__: null });

  // Captures a key and value of the form #key=value or @key=value
  const sourceMetaEntryRegExp =
    '\\s*[@#]\\s*([a-zA-Z][a-zA-Z0-9]*)\\s*=\\s*([^\\s\\*]*)';
  // Captures either a one-line or multi-line comment containing
  // one #key=value or @key=value.
  // Produces two pairs of capture groups, but the initial two may be undefined.
  // On account of the mechanics of regular expressions, scanning from the end
  // does not allow us to capture every pair, so getSourceURL must capture and
  // trim until there are no matching comments.
  const sourceMetaEntriesRegExp = new RegExp(
    `(?:\\s*//${sourceMetaEntryRegExp}|/\\*${sourceMetaEntryRegExp}\\s*\\*/)\\s*$`,
  );

  function getSourceURL(src) {
    let sourceURL = '<unknown>';

    // Our regular expression matches the last one or two comments with key value
    // pairs at the end of the source, avoiding a scan over the entire length of
    // the string, but at the expense of being able to capture all the (key,
    // value) pair meta comments at the end of the source, which may include
    // sourceMapURL in addition to sourceURL.
    // So, we sublimate the comments out of the source until no source or no
    // comments remain.
    while (src.length > 0) {
      const match = sourceMetaEntriesRegExp.exec(src);
      if (match === null) {
        break;
      }
      src = src.slice(0, src.length - match[0].length);

      // We skip $0 since it contains the entire match.
      // The match contains four capture groups,
      // two (key, value) pairs, the first of which
      // may be undefined.
      // On the off-chance someone put two sourceURL comments in their code with
      // different commenting conventions, the latter has precedence.
      if (match[3] === 'sourceURL') {
        sourceURL = match[4];
      } else if (match[1] === 'sourceURL') {
        sourceURL = match[2];
      }
    }

    return sourceURL;
  }

  // @ts-check

  /**
   * Find the first occurence of the given pattern and return
   * the location as the approximate line number.
   *
   * @param {string} src
   * @param {RegExp} pattern
   * @returns {number}
   */
  function getLineNumber(src, pattern) {
    const index = stringSearch(src, pattern);
    if (index < 0) {
      return -1;
    }
    return stringSplit(stringSlice(src, 0, index), '\n').length;
  }

  // /////////////////////////////////////////////////////////////////////////////

  const htmlCommentPattern = new RegExp(`(?:${'<'}!--|--${'>'})`, 'g');

  /**
   * Conservatively reject the source text if it may contain text that some
   * JavaScript parsers may treat as an html-like comment. To reject without
   * parsing, `rejectHtmlComments` will also reject some other text as well.
   *
   * https://www.ecma-international.org/ecma-262/9.0/index.html#sec-html-like-comments
   * explains that JavaScript parsers may or may not recognize html
   * comment tokens "<" immediately followed by "!--" and "--"
   * immediately followed by ">" in non-module source text, and treat
   * them as a kind of line comment. Since otherwise both of these can
   * appear in normal JavaScript source code as a sequence of operators,
   * we have the terrifying possibility of the same source code parsing
   * one way on one correct JavaScript implementation, and another way
   * on another.
   *
   * This shim takes the conservative strategy of just rejecting source
   * text that contains these strings anywhere. Note that this very
   * source file is written strangely to avoid mentioning these
   * character strings explicitly.
   *
   * We do not write the regexp in a straightforward way, so that an
   * apparennt html comment does not appear in this file. Thus, we avoid
   * rejection by the overly eager rejectDangerousSources.
   *
   * @param {string} src
   * @returns {string}
   */
  function rejectHtmlComments(src) {
    const lineNumber = getLineNumber(src, htmlCommentPattern);
    if (lineNumber < 0) {
      return src;
    }
    const name = getSourceURL(src);
    throw new SyntaxError(
      `Possible HTML comment rejected at ${name}:${lineNumber}. (SES_HTML_COMMENT_REJECTED)`,
    );
  }

  /**
   * An optional transform to place ahead of `rejectHtmlComments` to evade *that*
   * rejection. However, it may change the meaning of the program.
   *
   * This evasion replaces each alleged html comment with the space-separated
   * JavaScript operator sequence that it may mean, assuming that it appears
   * outside of a comment or literal string, in source code where the JS
   * parser makes no special case for html comments (like module source code).
   * In that case, this evasion preserves the meaning of the program, though it
   * does change the souce column numbers on each effected line.
   *
   * If the html comment appeared in a literal (a string literal, regexp literal,
   * or a template literal), then this evasion will change the meaning of the
   * program by changing the text of that literal.
   *
   * If the html comment appeared in a JavaScript comment, then this evasion does
   * not change the meaning of the program because it only changes the contents of
   * those comments.
   *
   * @param { string } src
   * @returns { string }
   */
  function evadeHtmlCommentTest(src) {
    const replaceFn = match => (match[0] === '<' ? '< ! --' : '-- >');
    return src.replace(htmlCommentPattern, replaceFn);
  }

  // /////////////////////////////////////////////////////////////////////////////

  const importPattern = new RegExp('\\bimport(\\s*(?:\\(|/[/*]))', 'g');

  /**
   * Conservatively reject the source text if it may contain a dynamic
   * import expression. To reject without parsing, `rejectImportExpressions` will
   * also reject some other text as well.
   *
   * The proposed dynamic import expression is the only syntax currently
   * proposed, that can appear in non-module JavaScript code, that
   * enables direct access to the outside world that cannot be
   * surpressed or intercepted without parsing and rewriting. Instead,
   * this shim conservatively rejects any source text that seems to
   * contain such an expression. To do this safely without parsing, we
   * must also reject some valid programs, i.e., those containing
   * apparent import expressions in literal strings or comments.
   *
   * The current conservative rule looks for the identifier "import"
   * followed by either an open paren or something that looks like the
   * beginning of a comment. We assume that we do not need to worry
   * about html comment syntax because that was already rejected by
   * rejectHtmlComments.
   *
   * this \s *must* match all kinds of syntax-defined whitespace. If e.g.
   * U+2028 (LINE SEPARATOR) or U+2029 (PARAGRAPH SEPARATOR) is treated as
   * whitespace by the parser, but not matched by /\s/, then this would admit
   * an attack like: import\u2028('power.js') . We're trying to distinguish
   * something like that from something like importnotreally('power.js') which
   * is perfectly safe.
   *
   * @param { string } src
   * @returns { string }
   */
  function rejectImportExpressions(src) {
    const lineNumber = getLineNumber(src, importPattern);
    if (lineNumber < 0) {
      return src;
    }
    const name = getSourceURL(src);
    throw new SyntaxError(
      `Possible import expression rejected at ${name}:${lineNumber}. (SES_IMPORT_REJECTED)`,
    );
  }

  /**
   * An optional transform to place ahead of `rejectImportExpressions` to evade
   * *that* rejection. However, it may change the meaning of the program.
   *
   * This evasion replaces each suspicious `import` identifier with `__import__`.
   * If the alleged import expression appears in a JavaScript comment, this
   * evasion will not change the meaning of the program. If it appears in a
   * literal (string literal, regexp literal, or a template literal), then this
   * evasion will change the contents of that literal. If it appears as code
   * where it would be parsed as an expression, then it might or might not change
   * the meaning of the program, depending on the binding, if any, of the lexical
   * variable `__import__`.
   *
   * Finally, if the original appears in code where it is not parsed as an
   * expression, for example `foo.import(path)`, then this evasion would rewrite
   * to `foo.__import__(path)` which has a surprisingly different meaning.
   *
   * @param { string } src
   * @returns { string }
   */
  function evadeImportExpressionTest(src) {
    const replaceFn = (_, p1) => `__import__${p1}`;
    return src.replace(importPattern, replaceFn);
  }

  // /////////////////////////////////////////////////////////////////////////////

  const someDirectEvalPattern = new RegExp('\\beval(\\s*\\()', 'g');

  /**
   * Heuristically reject some text that seems to contain a direct eval
   * expression, with both false positives and false negavives. To reject without
   * parsing, `rejectSomeDirectEvalExpressions` may will also reject some other
   * text as well. It may also accept source text that contains a direct eval
   * written oddly, such as `(eval)(src)`. This false negative is not a security
   * vulnerability. Rather it is a compat hazard because it will execute as
   * an indirect eval under the SES-shim but as a direct eval on platforms that
   * support SES directly (like XS).
   *
   * The shim cannot correctly emulate a direct eval as explained at
   * https://github.com/Agoric/realms-shim/issues/12
   * If we did not reject direct eval syntax, we would
   * accidentally evaluate these with an emulation of indirect eval. To
   * prevent future compatibility problems, in shifting from use of the
   * shim to genuine platform support for the proposal, we should
   * instead statically reject code that seems to contain a direct eval
   * expression.
   *
   * As with the dynamic import expression, to avoid a full parse, we do
   * this approximately with a regexp, that will also reject strings
   * that appear safely in comments or strings. Unlike dynamic import,
   * if we miss some, this only creates future compat problems, not
   * security problems. Thus, we are only trying to catch innocent
   * occurrences, not malicious one. In particular, `(eval)(...)` is
   * direct eval syntax that would not be caught by the following regexp.
   *
   * Exported for unit tests.
   *
   * @param { string } src
   * @returns { string }
   */
  function rejectSomeDirectEvalExpressions(src) {
    const lineNumber = getLineNumber(src, someDirectEvalPattern);
    if (lineNumber < 0) {
      return src;
    }
    const name = getSourceURL(src);
    throw new SyntaxError(
      `Possible direct eval expression rejected at ${name}:${lineNumber}. (SES_EVAL_REJECTED)`,
    );
  }

  // /////////////////////////////////////////////////////////////////////////////

  /**
   * A transform that bundles together the transforms that must unconditionally
   * happen last in order to ensure safe evaluation without parsing.
   *
   * @param {string} source
   * @returns {string}
   */
  function mandatoryTransforms(source) {
    source = rejectHtmlComments(source);
    source = rejectImportExpressions(source);
    return source;
  }

  /**
   * Starting with `source`, apply each transform to the result of the
   * previous one, returning the result of the last transformation.
   *
   * @param {string} source
   * @param {((str: string) => string)[]} transforms
   * @returns {string}
   */
  function applyTransforms(source, transforms) {
    for (const transform of transforms) {
      source = transform(source);
    }
    return source;
  }

  exports.applyTransforms = applyTransforms;
  exports.evadeHtmlCommentTest = evadeHtmlCommentTest;
  exports.evadeImportExpressionTest = evadeImportExpressionTest;
  exports.mandatoryTransforms = mandatoryTransforms;
  exports.rejectHtmlComments = rejectHtmlComments;
  exports.rejectImportExpressions = rejectImportExpressions;
  exports.rejectSomeDirectEvalExpressions = rejectSomeDirectEvalExpressions;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
