/**
 * Utility functions for working with LavaMoat policies.
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import { lavaMoatPolicySchema } from './policy-schema.js'
import type { LavaMoatPolicy } from './types.js'

/**
 * Asserts that `allegedPolicy` is a valid LavaMoat policy.
 *
 * @privateRemarks
 * This function _must_ be defined using a function declaration due to
 * TypeScript's quirks around `asserts`-style type guards.
 * @param allegedPolicy Alleged LavaMoat policy to validate
 * @throws {z.ZodError} If `allegedPolicy` is not a valid LavaMoat policy.
 * @see {@link isLavaMoatPolicy} for a type guard
 * @see {@link validateLavaMoatPolicy} for a validation function that returns an
 *   error message if invalid
 * @see {@link https://zod.dev/error-formatting}
 */
export function assertLavaMoatPolicy(
  allegedPolicy: unknown
): asserts allegedPolicy is LavaMoatPolicy {
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
export const isLavaMoatPolicy = (
  allegedPolicy: unknown
): allegedPolicy is LavaMoatPolicy =>
  lavaMoatPolicySchema.safeParse(allegedPolicy).success

/**
 * Validate an alleged LavaMoat policy, returning a safe-parsing result.
 *
 * @remarks
 * Does not return the original `ZodError`!
 * @param allegedPolicy Alleged LavaMoat policy to validate
 * @returns Object with `data` & `success=true` if valid, or `errorMessage` &
 *   `success=false` if invalid.
 * @see {@link isLavaMoatPolicy} for a type guard
 * @see {@link assertLavaMoatPolicy} for an assertion
 * @see {@link https://zod.dev/basics#handling-errors | z.safeParse() documentation}
 */
export const validateLavaMoatPolicy = (
  allegedPolicy: unknown
):
  | { data: LavaMoatPolicy; success: true; error?: never }
  | { message: string; error: z.ZodError<LavaMoatPolicy>; success: false } => {
  const result = lavaMoatPolicySchema.safeParse(allegedPolicy)
  return result.success
    ? result
    : { ...result, message: z.prettifyError(result.error) }
}

/**
 * Converts {@link lavaMoatPolicySchema} to a JSON Schema (version 2020-12)
 *
 * @returns JSON Schema _object_ (not a _string_!)
 */
export const createLavaMoatPolicyJSONSchema = () =>
  z.toJSONSchema(lavaMoatPolicySchema)
