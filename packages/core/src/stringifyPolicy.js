const jsonStringify = require('json-stable-stringify')

/**
 * @import {LavaMoatPolicy, LavaMoatPolicyDebug} from './schema'
 */

module.exports = {
  /**
   * Stringifies a policy, sorting the keys in a diff-friendly way.
   *
   * @param {LavaMoatPolicy | LavaMoatPolicyDebug} policy
   * @returns {string}
   */
  jsonStringifySortedPolicy(policy) {
    const result = jsonStringify(policy, {
      space: 2,
      cmp: diffFriendlyPolicyKeysComparator,
    })
    if (result === undefined) {
      throw new TypeError('Failed to stringify policy')
    }
    return result
  },
}

function diffFriendlyPolicyKeysComparator({ key: a }, { key: b }) {
  if (a === b) return 0
  if (a.includes('>')) {
    a = a.split('>').reverse().join('<')
  }
  if (b.includes('>')) {
    b = b.split('>').reverse().join('<')
  }
  return a < b ? -1 : 1
}
