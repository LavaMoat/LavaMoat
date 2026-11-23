/**
 * `@lavamoat/core` — LavaMoat kernel-free core library.
 *
 * Provides policy generation, policy utilities, endowments, and scuttling.
 *
 * @packageDocumentation
 */

export * from './code-sample-from-ast-node.js'
export * from './compact.js'
export * from './constants.js'
export * from './generate-policy.js'
export * from './load-policy.js'
export * from './merge-policy.js'
export { LavamoatModuleRecord, ROOT_SLUG } from './module-record.js'
export type { LavamoatModuleRecordOptions } from './module-record.js'
export * from './stringify-policy.js'

// NOTE: `endowments-toolkit` and `scuttle` are intentionally NOT re-exported
// from the main entry point. Both modules perform work at evaluation time that
// requires SES to already be loaded (scuttle calls `new Compartment()`).
// Import them directly from their subpath exports instead:
//   import { endowmentsToolkit } from '@lavamoat/core/endowments-toolkit'
//   import { scuttle } from '@lavamoat/core/scuttle'
