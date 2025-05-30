import { LavaMoatPolicy } from '@lavamoat/types'
import { z } from 'zod/v4'
import { lavaMoatPolicySchema } from './policy-schema.js'
/**
 * Options for `isLavaMoatPolicy()`
 */
export interface IsLavaMoatPolicyOptions {
  /**
   * If provided, will be called before returning `false` if the object is
   * invalid.
   *
   * @param message Human-readable message
   * @param error Raw `ZodError` from parse failure
   */
  onFailure?: IsLavaMoatPolicyOnFailureFn

  /**
   * If provided, will be called with a new `LavaMoatPolicy` based on the
   * original, stripped of extraneous properties.
   *
   * @param policy A new, minimal `LavaMoatPolicy` object
   */
  onSuccess?: IsLavaMoatPolicyOnSuccessFn
}

/**
 * {@inheritDoc IsLavaMoatPolicyOptions.onFailure}
 *
 * @see {@link IsLavaMoatPolicyOptions.onFailure}
 */
export type IsLavaMoatPolicyOnFailureFn = (
  this: void,
  message: string,
  error: z.ZodError
) => void

/**
 * {@inheritDoc IsLavaMoatPolicyOptions.onSuccess}
 *
 * @see {@link IsLavaMoatPolicyOptions.onSuccess}
 */
export type IsLavaMoatPolicyOnSuccessFn = (
  this: void,
  policy: LavaMoatPolicy
) => void

/**
 * Asserts that `allegedPolicy` is a valid LavaMoat policy.
 *
 * @param allegedPolicy
 * @throws {z.ZodError} If `allegedPolicy` is not a valid LavaMoat policy.
 * @see {@link https://zod.dev/error-formatting}
 */
export const assertLavaMoatPolicy = (
  allegedPolicy: unknown
): asserts allegedPolicy is LavaMoatPolicy => {
  lavaMoatPolicySchema.parse(allegedPolicy)
}

/**
 * Asserts that `allegedPolicy` is a valid LavaMoat policy
 */
export const isLavaMoatPolicy = (
  allegedPolicy: unknown,
  { onFailure, onSuccess }: IsLavaMoatPolicyOptions = {}
): allegedPolicy is LavaMoatPolicy => {
  const { success, data, error } = lavaMoatPolicySchema.safeParse(allegedPolicy)

  if (success) {
    if (onSuccess) {
      onSuccess(data)
    }
  } else {
    if (onFailure) {
      onFailure(z.prettifyError(error), error)
    }
  }
  return success
}

/**
 * Converts {@link lavaMoatPolicySchema} to a JSON Schema (version 2020-12)
 */
export const createLavaMoatPolicyJSONSchema =
  (): z.core.JSONSchema.BaseSchema => z.toJSONSchema(lavaMoatPolicySchema)
