/**
 * Entry point for the programmable API.
 *
 * @privateRemarks
 * Other source modules in this package _should never_ import this module
 * directly, since a) it will most certainly cause a cycle, and b) it loads the
 * preamble.
 * @packageDocumentation
 */
import './preamble.js'

import * as constants from './constants.js'

export * from './error-code.js'
export { execute } from './exec/execute.js'
export { load } from './exec/load.js'
export { run } from './exec/run.js'
export { toEndoPolicy } from './policy-converter.js'
export { generatePolicy } from './policy-gen/generate.js'
export {
  loadPolicy,
  policyInput,
  policyOverrideAuto,
  policyOverrideNone,
  policyOverrideSourceFromFile,
  policyOverrideSourceFromInline,
  policySourceFromDefault,
  policySourceFromFile,
  policySourceFromInline,
} from './policy-input.js'
export {
  assertPolicy,
  isMergedWrapper,
  isPolicy,
  isTrusted,
  maybeReadPolicyOverride,
  mergePolicies,
  readPolicy,
  unwrapMerged,
  wrapMerged,
  writePolicy,
} from './policy-util.js'
export * from './types.js'
export { constants }
