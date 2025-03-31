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
 * @param {Array} [options.polyfills=[]] - An array of additional polyfills to
 *   include as SES vetted shims. Defaults to an empty array. Default is `[]`
 * @returns {Array} An array of polyfills to include in the bundle, listed as
 *   resolved module paths.
 */
const makeGetPolyfills = ({ engine, polyfills }) => {
  polyfills === undefined && (polyfills = require('@react-native/js-polyfills')());
  const ses =
    engine === 'hermes' ? require.resolve('ses/hermes') : require.resolve('ses')
  const repair = require.resolve('./repair.js')
  const harden = require.resolve('./harden.js')
  return [ses, repair, ...polyfills, harden]
}

module.exports = makeGetPolyfills
