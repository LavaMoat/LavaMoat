/**
 * This tests use of custom module transforms ("evasions") during policy
 * generation
 *
 * @packageDocumentation
 */

import 'ses'

import test from 'ava'
import { createGeneratePolicyMacros } from './macros.js'
const { testPolicyForScript } = createGeneratePolicyMacros(test)

// This evasion wraps `pos--` in an array then takes the first element, as
// innovated by @gibson042
test(
  'the Gibson',
  testPolicyForScript,
  `
let pos = 10;
while (pos--` +
    ` > 0) {
  console.log(pos)
}
`,
  {
    resources: {
      test: {
        globals: {
          'console.log': true,
        },
      },
    },
  }
)

// This kind of crap was found in the TypeScript source
test(
  'dynamic import call in string',
  testPolicyForScript,
  `
console.log("you can use await import` +
    `('fs') to import ESM from CJS");
`,
  {
    resources: {
      test: {
        globals: {
          'console.log': true,
        },
      },
    },
  }
)
