/**
 * Splits a raw argument vector into `lavax`'s own options, the package spec,
 * and the arguments to forward to the package's bin.
 *
 * `lavax` follows the same contract as `npx`: every token after the `<spec>`
 * positional belongs to the package's bin, _not_ to `lavax`. This cannot be
 * expressed with yargs' option parser alone (separate-token option values
 * conflict with `halt-at-non-option`), so we split first and hand yargs only
 * the leading options plus the spec.
 *
 * **All exports in this module are considered part of the public API.**
 *
 * @packageDocumentation
 */

/**
 * `lavax` options which consume a following token as their value when written
 * in separate-token form (e.g. `--cache /tmp/x`).
 */
const VALUE_OPTIONS = new Set([
  '-c',
  '--call',
  '--registry',
  '--cache',
  '-p',
  '--policy',
])

/**
 * The result of {@link splitArgs}.
 *
 * @typedef SplitArgs
 * @property {string[]} optionTokens Tokens that are `lavax`'s own options
 * @property {string | undefined} spec The package spec, if present
 * @property {string[]} forwardedArgs Arguments to forward to the bin
 */

/**
 * Splits `argv` at the package spec.
 *
 * @param {string[]} argv Argument vector (already stripped of `node` and the
 *   script path)
 * @returns {SplitArgs}
 */
export const splitArgs = (argv) => {
  /** @type {string[]} */
  const optionTokens = []

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]

    // An explicit `--` ends option parsing: the next token is the spec and the
    // remainder is forwarded verbatim.
    if (token === '--') {
      return {
        optionTokens,
        spec: argv[i + 1],
        forwardedArgs: argv.slice(i + 2),
      }
    }

    if (token.startsWith('-')) {
      optionTokens.push(token)
      const next = argv[i + 1]
      if (
        VALUE_OPTIONS.has(token) &&
        next !== undefined &&
        !next.startsWith('-')
      ) {
        optionTokens.push(next)
        i++
      }
      continue
    }

    // First non-option token is the spec; everything after is forwarded.
    let forwardedArgs = argv.slice(i + 1)
    if (forwardedArgs[0] === '--') {
      forwardedArgs = forwardedArgs.slice(1)
    }
    return { optionTokens, spec: token, forwardedArgs }
  }

  return { optionTokens, spec: undefined, forwardedArgs: [] }
}
