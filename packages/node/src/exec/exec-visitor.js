/**
 * Provides {@link createExecVisitor}, an AST-based transform.
 *
 * Handles five LavaMoat-specific source concerns:
 *
 * 1. **Hashbang removal** — strips the `#!...` interpreter directive so
 *    `@babel/generator` does not re-emit it (SES rejects hashbangs).
 * 2. **Direct-eval evasion** — rewrites `eval(...)` to `(0, eval)(...)`, which
 *    promotes a direct `eval` call to an indirect one so it operates in global
 *    scope rather than the local scope.
 * 3. **Eval-in-comment defanging** — neutralizes `eval(` patterns found inside
 *    comments. SES's `rejectSomeDirectEvalExpressions` matches the raw source
 *    text and is not comment-aware, so an innocent JSDoc mention like `'eval()'
 *    calls` would otherwise throw `SES_EVAL_REJECTED`.
 * 4. **Eval-in-string splitting** — string literals whose value contains `eval(`
 *    (e.g. webpack's `"eval()"` bailout reason) likewise trip SES. We rewrite
 *    the literal to a `BinaryExpression` like `"e" + "val()"` so the runtime
 *    value is preserved but the generated source no longer contains a
 *    contiguous `eval(`.
 * 5. **Eval-in-template escaping** — for non-tagged template literals we rewrite
 *    the `e` of any offending `eval(` in the _raw_ source to its `\u0065`
 *    unicode escape. The JS engine cooks `\u0065val(` back to `eval(`, so the
 *    runtime (cooked) value is preserved exactly while the on-disk source no
 *    longer trips SES. Tagged templates are deliberately skipped because the
 *    tag function may observe `raw`.
 *
 * @packageDocumentation
 * @internal
 */

/**
 * @import {
 *   BinaryExpression,
 *   Comment,
 *   Identifier,
 *   StringLiteral
 * } from "@babel/types"
 * @import {VisitorPass} from "@endo/parser-pipeline"
 */

/**
 * Mirrors SES's textual direct-eval detection regex so we neutralize exactly
 * what SES would otherwise reject. SES applies this to the entire generated
 * source — including comments and string literals — without parsing.
 *
 * @see {@link https://github.com/endojs/endo/blob/master/packages/ses/error-codes/SES_EVAL_REJECTED.md}
 */
const SES_DIRECT_EVAL_RE = /(^|[^.])\beval(\s*\()/g

/**
 * Non-consuming variant of {@link SES_DIRECT_EVAL_RE} used to locate eval
 * occurrences inside a string literal's value without swallowing the trailing
 * `(`. The lookahead ensures `lastIndex` advances only past the `eval` token,
 * which keeps multi-match scans simple.
 */
const SES_DIRECT_EVAL_LOCATE_RE = /(^|[^.])\beval(?=\s*\()/g

/**
 * Defangs any `eval(` occurrences inside a comment so SES's regex cannot match.
 * We insert a `_` between `eval` and its opening paren, which keeps the comment
 * readable while breaking the `\beval\s*\(` match.
 *
 * @param {Comment} comment
 */
const defangEvalInComment = (comment) => {
  comment.value = comment.value.replace(
    SES_DIRECT_EVAL_RE,
    (_match, before, after) => `${before}eval_${after}`
  )
}

/**
 * Splits a string value at every position SES would flag as a direct eval, such
 * that no resulting piece contains a contiguous `eval(` sequence. The split is
 * placed immediately after the `e` of each offending `eval`, which is the
 * cheapest cut that defeats `\beval\s*\(`.
 *
 * Returns `null` when the value contains nothing SES would reject — letting
 * callers cheaply skip the rewrite.
 *
 * @param {string} value
 * @returns {string[] | null}
 */
const splitStringForSes = (value) => {
  SES_DIRECT_EVAL_LOCATE_RE.lastIndex = 0
  /** @type {number[]} */
  const splitPoints = []
  let m
  while ((m = SES_DIRECT_EVAL_LOCATE_RE.exec(value)) !== null) {
    // m.index points at the prefix char (or start-of-string when m[1] is '').
    // The 'e' of 'eval' sits one prefix-length further in; cut just after it.
    splitPoints.push(m.index + m[1].length + 1)
    // Defensive: zero-width matches shouldn't be possible here, but guard
    // against the engine getting stuck if the regex ever changes.
    if (m.index === SES_DIRECT_EVAL_LOCATE_RE.lastIndex) {
      SES_DIRECT_EVAL_LOCATE_RE.lastIndex += 1
    }
  }
  if (splitPoints.length === 0) {
    return null
  }
  /** @type {string[]} */
  const parts = []
  let prev = 0
  for (const p of splitPoints) {
    parts.push(value.slice(prev, p))
    prev = p
  }
  parts.push(value.slice(prev))
  return parts
}

/**
 * Builds a left-associative `+` chain of `StringLiteral` nodes from the given
 * pieces. Single-piece input returns a plain `StringLiteral`; the caller is
 * responsible for not invoking this with an empty array.
 *
 * @param {string[]} parts
 * @returns {StringLiteral | BinaryExpression}
 */
const buildStringConcatExpression = (parts) => {
  /** @type {StringLiteral | BinaryExpression} */
  let expr = { type: 'StringLiteral', value: parts[0] }
  for (let i = 1; i < parts.length; i += 1) {
    expr = {
      type: 'BinaryExpression',
      operator: '+',
      left: expr,
      right: { type: 'StringLiteral', value: parts[i] },
    }
  }
  return expr
}

/**
 * Rewrites the `e` of any SES-flagged `eval(` inside a template element's raw
 * source as `\u0065`. The JS engine cooks `\u0065val(` back to `eval(` at
 * runtime, so the cooked value is preserved exactly — only the literal source
 * bytes change.
 *
 * @param {string} raw
 * @returns {string}
 */
const escapeEvalInTemplateRaw = (raw) =>
  raw.replace(
    SES_DIRECT_EVAL_RE,
    (_match, before, after) => `${before}\\u0065val${after}`
  )

/**
 * Creates an AST transform pass that:
 *
 * - Strips hashbang (`#!...`) interpreter directives from the `Program` node.
 * - Rewrites direct `eval(...)` calls to `(0, eval)(...)`.
 * - Defangs `eval(` patterns in comments to prevent `SES_EVAL_REJECTED`.
 * - Splits string literals containing `eval(` into a runtime-equivalent `"e" +
 *   "val(...)"` concatenation for the same reason.
 * - Escapes the `e` of `eval(` to `\u0065` inside non-tagged template literal raw
 *   source.
 *
 * @returns {VisitorPass}
 */
export const createExecVisitor = () => {
  /**
   * A cache of evaded eval calls to avoid infinite recursion.
   *
   * @type {WeakSet<Identifier>}
   */
  const evadedEvals = new WeakSet()

  return {
    visitor: {
      Program: {
        /**
         * Remove the hashbang interpreter directive so @babel/generator does
         * not re-emit it (SES rejects sources that begin with `#!`), and defang
         * any `eval(` patterns lurking in comments attached to the enclosing
         * `File` node.
         *
         * Note that hashbang stripping only affects CJS sources in practice, as
         * the MJS parser strips the hashbang itself.
         */
        enter(path) {
          if (path.get('interpreter')) {
            path.node.interpreter = null
          }

          // Babel's parser hangs the canonical comment list off the File
          // node and attaches the *same* comment objects to individual
          // nodes via leading/inner/trailingComments. Mutating each
          // comment's `value` here updates every reference at once.
          const file = path.parent
          if (file && file.type === 'File' && Array.isArray(file.comments)) {
            for (const comment of file.comments) {
              defangEvalInComment(comment)
            }
          }
        },
      },

      /**
       * Rewrite direct `eval(args)` to `(0, eval)(args)`.
       *
       * A direct eval call gives the callee access to the caller's lexical
       * scope, which undermines SES's scope isolation. Turning it into an
       * indirect call (i.e. not immediately preceded by a member-expression or
       * direct identifier reference) makes it operate in global scope instead.
       */
      CallExpression(path) {
        const { callee } = path.node
        if (
          callee.type === 'Identifier' &&
          callee.name === 'eval' &&
          !evadedEvals.has(callee)
        ) {
          // Mark the new callee so we don't re-visit it.
          evadedEvals.add(callee)
          path.node.callee = {
            type: 'SequenceExpression',
            expressions: [{ type: 'NumericLiteral', value: 0 }, callee],
          }
        }
      },

      /**
       * Split string literals whose value would trip SES's direct-eval regex
       * into a `BinaryExpression` of two-or-more concatenated `StringLiteral`s.
       * Runtime semantics are preserved exactly; only the generated source
       * layout changes.
       *
       * Replacement nodes are themselves `StringLiteral`s, but each piece is —
       * by construction — split such that no piece can match the SES regex on
       * its own, so re-traversal is a safe no-op.
       */
      StringLiteral(path) {
        const parts = splitStringForSes(path.node.value)
        if (parts === null) {
          return
        }
        path.replaceWith(buildStringConcatExpression(parts))
      },

      /**
       * Escape `eval(` inside template literal quasis by rewriting the leading
       * `e` as `\u0065` in the raw source. We mutate the existing
       * `TemplateElement` nodes in place rather than restructuring the literal,
       * so cooked values, source positions, and the overall quasi/expression
       * layout are all preserved.
       *
       * Tagged templates are skipped because the tag function can observe `raw`
       * (e.g. via `String.raw`), and changing it would alter the tag's input —
       * see the equivalent reasoning in `@endo/evasive-transform`'s
       * `evadeTemplates`.
       */
      TemplateLiteral(path) {
        if (path.parent.type === 'TaggedTemplateExpression') {
          return
        }
        for (const quasi of path.node.quasis) {
          const escaped = escapeEvalInTemplateRaw(quasi.value.raw)
          if (escaped !== quasi.value.raw) {
            quasi.value.raw = escaped
          }
        }
      },
    },
  }
}
