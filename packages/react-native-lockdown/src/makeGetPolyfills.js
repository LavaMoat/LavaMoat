const path = require('node:path')

/**
 * Generates a list of polyfills with SES to include in the Metro bundle. This
 * sets up a Hardened JavaScript environment on React Native apps at earliest
 * point of entry.
 *
 * @example See README.md for usage
 *
 * TODO: ({platform: ?string})
 * https://metrobundler.dev/docs/configuration/#getpolyfills
 *
 * TODO: De-duplicate polyfills if '@react-native/polyfills' provided.
 *
 * NB: Since we override the default React Native polyfills, we slot them in as
 * SES vetted shims here.
 *
 * @param {Object} options - An object containing the following properties:
 * @param {string} options.engine - The JavaScript engine to secure. If not
 *   'hermes', vanilla flavoured SES will be used.
 * @param {Array} [options.polyfills] - An array of additional polyfills to
 *   include as SES vetted shims. If not provided, the default React Native
 *   polyfills (@react-native/js-polyfills) will be used.
 * @returns {Array} An array of polyfills to include in the bundle, listed as
 *   resolved module paths.
 */
const makeGetPolyfills = ({ engine, polyfills }) => {
  polyfills === undefined &&
    (polyfills = require('@react-native/js-polyfills')())
  const ses =
    engine === 'hermes' ? require.resolve('ses/hermes') : require.resolve('ses')
  const repair = require.resolve('./repair.js')
  const harden = require.resolve('./harden.js')

  if (!Array.isArray(polyfills)) {
    throw new Error(
      `Expected polyfills to be an array, but received ${typeof polyfills}`
    )
  }
  // in case someone forgot to spread an array they got from
  // somewhere like react-native polyfills, we'll do it for them.
  polyfills = polyfills.flat()
  validatePolyfills(polyfills)

  return [ses, repair, ...polyfills, harden]
}

module.exports = makeGetPolyfills

function validatePolyfills(polyfills) {
  for (const polyfill of polyfills) {
    if (typeof polyfill !== 'string') {
      if (typeof polyfill === 'function') {
        throw new Error(
          `Expected polyfills to be an array of strings, but found a function. Looks like you're passing react-native/js-polyfills but not calling the function they export. Yes, it's not very intuitive, but it is what it is.`
        )
      }
      throw new Error(
        `Expected polyfills to be an array of strings, but received ${typeof polyfill}`
      )
    } else {
      // make sure the polyfill is a resolved path not just a package name
      if (!path.isAbsolute(polyfill) && !polyfill.startsWith('.')) {
        throw new Error(
          `Polyfill must be a resolved path, not just a package name: ${polyfill}`
        )
      }
    }
  }
}
