import type {
  LavaMoatPolicy,
  Resources,
  SomeLavaMoatPolicy,
} from '@lavamoat/types'
import { z } from 'zod/v4'
import { lavaMoatPolicySchema } from './policy-schema.js'

export type * from '@lavamoat/types/policy'

/**
 * Asserts that `allegedPolicy` is a valid LavaMoat policy.
 *
 * @param allegedPolicy Alleged LavaMoat policy to validate
 * @throws {z.ZodError} If `allegedPolicy` is not a valid LavaMoat policy.
 * @see {@link isLavaMoatPolicy} for a type guard
 * @see {@link validateLavaMoatPolicy} for a validation function that returns
 *   an error message if invalid
 * @see {@link https://zod.dev/error-formatting}
 */
export const assertLavaMoatPolicy = (
  allegedPolicy: unknown
): asserts allegedPolicy is LavaMoatPolicy => {
  lavaMoatPolicySchema.parse(allegedPolicy)
}

/**
 * Type guard for a {@link LavaMoatPolicy LavaMoat policy}
 *
 * @param allegedPolicy Alleged LavaMoat policy to validate
 * @returns `true` if `allegedPolicy` is a valid LavaMoat policy, `false`
 *   otherwise
 * @see {@link validateLavaMoatPolicy} for a validation function that returns
 *   an error message if invalid
 * @see {@link assertLavaMoatPolicy} for an assertion
 */
export const isLavaMoatPolicy = <T extends Resources = Resources>(
  allegedPolicy: unknown
): allegedPolicy is LavaMoatPolicy<T> =>
  lavaMoatPolicySchema.safeParse(allegedPolicy).success

/**
 * Validate an alleged LavaMoat policy, returning an error message if invalid.
 *
 * @remarks
 * Does not return the original `ZodError`!
 * @param allegedPolicy Alleged LavaMoat policy to validate
 * @returns Object with `data` & `success=true` if valid, or `errorMessage` &
 *   `success=false` if invalid.
 * @see {@link isLavaMoatPolicy} for a type guard
 * @see {@link assertLavaMoatPolicy} for an assertion
 */
export const validateLavaMoatPolicy = (
  allegedPolicy: unknown
):
  | { data: LavaMoatPolicy; success: true }
  | { message: string; cause: z.ZodError; success: false } => {
  const result = lavaMoatPolicySchema.safeParse(allegedPolicy)
  return result.success
    ? { data: result.data, success: true }
    : {
        message: z.prettifyError(result.error),
        cause: result.error,
        success: false,
      }
}

/**
 * Given a LavaMoat-policy-compatible object, narrows its type.
 *
 * For untyped usage, this is just an identify function.
 *
 * @template T The contents of {@link LavaMoatPolicy.resources}
 * @param policy LavaMoat policy to narrow
 * @returns Original policy, but narrowed on `Resources`
 */
export const inferLavaMoatPolicy = <T extends Resources>(
  policy: SomeLavaMoatPolicy
): LavaMoatPolicy<T> => policy as LavaMoatPolicy<T>

/**
 * Converts {@link lavaMoatPolicySchema} to a JSON Schema (version 2020-12)
 *
 * @returns JSON Schema _object_ (not a _string_!)
 */
export const createLavaMoatPolicyJSONSchema =
  (): z.core.JSONSchema.BaseSchema => z.toJSONSchema(lavaMoatPolicySchema)
