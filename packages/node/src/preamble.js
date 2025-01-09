/**
 * The preamble must be loaded before any other code, as it initializes SES &
 * calls {@link lockdown}.
 *
 * @packageDocumentation
 */

import 'ses'

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
