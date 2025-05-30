// store-jsdoc-only.js

/**
 * @template T
 * @template {keyof T} K
 * @typedef {T & Required<Pick<T, K>>} RequireFields
 */

/**
 * @template {Record<string, any>} T
 * @template {keyof T} K
 * @param {T} storeObj
 * @param {readonly K[]} fields
 * @returns {asserts storeObj is RequireFields<T, K>}
 */
const assertFields = (storeObj, fields) => {
  const missingFields = fields.filter((field) => storeObj[field] === undefined)

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

module.exports = {
  assertFields,
}
