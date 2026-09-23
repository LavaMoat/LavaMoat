/**
 * The preamble must be loaded before any other code, as it initializes SES &
 * calls {@link lockdown}.
 *
 * @packageDocumentation
 */

import 'ses'

// call repairInstrinsics, call something else, then call hardenInstrinsics
// see https://github.com/LavaMoat/LavaMoat/blob/772d936aefb9e256742e610e69f871bc782d1e80/packages/webpack/src/runtime/runtime.js#L17-L35
lockdown({
  // lets code observe call stack, but easier debuggability
  errorTaming: 'unsafe',
  // shows the full call stack
  stackFiltering: 'verbose',
  // prevents most common override mistake cases from tripping up users
  overrideTaming: 'severe',
  // preserves JS locale methods, to avoid confusing users
  // prevents aliasing: toLocaleString() to toString(), etc
  localeTaming: 'unsafe',
})
