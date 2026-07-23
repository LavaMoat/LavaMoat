/**
 * @callback IsError
 * @param {unknown} input
 * @returns {input is Error}
 */

const isError = /** @type {IsError} */ (
  // @ts-expect-error I don't care
  Error.isError || ((value) => value instanceof Error)
)

/** @param {unknown} input */
export function print(input) {
  if (isError(input)) {
    console.error(input.message || input)
  } else {
    console.log(input)
  }
}
