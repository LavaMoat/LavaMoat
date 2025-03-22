const jsonStringify = require('json-stable-stringify')

/**
 * @import {LavaMoatPolicy} from './types.js'
 */

module.exports = {
  /**
   * @param {LavaMoatPolicy} policy
   * @returns {string}
   */
  jsonStringifySortedPolicy(policy) {
    return /** @type {string} */ (
      jsonStringify(policy, {
        space: 2,
        cmp: diffFriendlyPolicyKeysComparator,
      })
    )
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
