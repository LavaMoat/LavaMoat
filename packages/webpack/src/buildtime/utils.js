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
 * @param {K[]} fields
 * @returns {RequireFields<T, K>}
 */
const assertFields = (storeObj, fields) => {
  const missingFields = fields.filter((field) => storeObj[field] === undefined)

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }

  return /** @type {RequireFields<T, K>} */ (storeObj);
}

/**
 * @template {Record<string, any>} T
 * @template {keyof T} K
 * @param {T} storeObj
 * @param {K[]} fields
 * @returns {RequireFields<T, K>}
 */
const consumeFields = (storeObj, fields) => {
  assertFields(storeObj, fields)
  return /** @type {RequireFields<T, K>} */ (
    Object.fromEntries(
      fields.map(field => [field, storeObj[field]])
    )
  )
}

module.exports = {
  assertFields,
  consumeFields,
}
