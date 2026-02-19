import test from 'ava'
import 'ses'
import {
  syncModuleTransforms,
  useLocalTransforms,
} from '../../../src/compartment/module-transforms.js'

import { importLocation } from '@endo/compartment-mapper'

// --- Tests for useLocalTransforms (hashbang and direct eval only) ---

test('useLocalTransforms - leaves non-hashbang code unchanged', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'console.log("hello");'
    ),
    'console.log("hello");'
  )
})

test('useLocalTransforms - replaces direct eval with indirect eval', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'const result = eval("1 + 1");'
    ),
    'const result = (0,eval)("1 + 1");'
  )
})

test('useLocalTransforms - handles multiple evals', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'eval("foo"); eval("bar");'
    ),
    '(0,eval)("foo"); (0,eval)("bar");'
  )
})

test('useLocalTransforms - preserves spacing', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'eval  ("test")'
    ),
    '(0,eval)  ("test")'
  )
})

test('useLocalTransforms - removes hashbang with LF', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      '#!/usr/bin/env node\nconsole.log("hello");'
    ),
    '// /usr/bin/env node\nconsole.log("hello");'
  )
})

test('useLocalTransforms - removes hashbang with CRLF', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      '#!/usr/bin/env node\r\nconsole.log("hello");'
    ),
    '// /usr/bin/env node\r\nconsole.log("hello");'
  )
})

// --- Tests for full module transform (via syncModuleTransforms.mjs) ---

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Helper to run the mjs transform and return the resulting code
 *
 * @param {string} source
 * @returns {string}
 */
const applyMjsTransform = (source) => {
  const sourceBytes = encoder.encode(source)
  const result = syncModuleTransforms.mjs(
    sourceBytes,
    'test.mjs',
    'file://test/',
    'file://test/',
    {}
  )
  return decoder.decode(result.bytes)
}

test('syncModuleTransforms.mjs - evade comments - transforms decrement operator in comparison', (t) => {
  const result = applyMjsTransform('if (item[1]--> b) {}')
  // The evasive transform should add a space between -- and >
  t.false(result.includes('-->'), `Should not contain --> sequence: ${result}`)
})

test('syncModuleTransforms.mjs - evade comments - handles variable names', (t) => {
  const result = applyMjsTransform('if (count--> 0) {}')
  t.false(result.includes('-->'), `Should not contain --> sequence: ${result}`)
})

test('syncModuleTransforms.mjs - evade comments - handles multiple occurrences', (t) => {
  const result = applyMjsTransform('if (a--> b && c--> d) {}')
  t.false(result.includes('-->'), `Should not contain --> sequence: ${result}`)
})

test('syncModuleTransforms.mjs - evade comments - complete comment', (t) => {
  const result = applyMjsTransform('const x = 1; // <!-- this is a comment -->')
  t.false(
    result.includes('<!--'),
    `Should not contain HTML comment start: ${result}`
  )
})

test('syncModuleTransforms.mjs - evadeImportString - handles single quotes', (t) => {
  const result = applyMjsTransform("const s = 'dynamic import()';")
  t.false(
    result.includes("'dynamic import()'"),
    `Should transform import in string: ${result}`
  )
})

test('syncModuleTransforms.mjs - evadeImportString - handles backticks', (t) => {
  const result = applyMjsTransform('const s = `template import()`;')
  t.false(
    result.includes('`template import()`'),
    `Should transform import in template: ${result}`
  )
})

test('syncModuleTransforms.mjs - evadeImportString - only affects strings', (t) => {
  const result = applyMjsTransform(
    'const x = import("module"); const s = "import()";'
  )
  // Real import should be preserved, string import should be transformed
  t.true(
    result.includes('import("module")'),
    `Real import should be preserved: ${result}`
  )
})

test('syncModuleTransforms.mjs - evadeImportString - handles multiple occurrences in string', (t) => {
  const result = applyMjsTransform('const s = "import() and import()";')
  // Should not contain untransformed import() in a string
  t.false(
    result.includes('"import() and import()"'),
    `Should transform imports in string: ${result}`
  )
})

// --- Integration tests with importLocation ---

/**
 * @param {string} transformed
 * @returns {import('@endo/compartment-mapper').ReadFn}
 */
const makeFakeReadFor = (transformed) => async (location) => {
  /** @type {Record<string, string>} */
  const fs = {
    'file://location/index.mjs': transformed,
    'file://location/dynamic.mjs': `dynamicCallback();`,
    'file://location/package.json':
      '{"name":"location", "main":"index.mjs", "type":"module"}',
  }
  const choice = fs[location]
  if (choice === undefined) {
    throw new Error(`File not found: ${location}`)
  }
  const encoded = new TextEncoder().encode(choice)
  return encoded
}

/**
 * @param {import('ava').ExecutionContext} t
 * @param {string} input
 */
const testTransformAgainstEndo = async (t, input) => {
  const transformed = applyMjsTransform(input)

  t.log(transformed)

  /** @type {function} */
  let resolv
  const dynamicImportPromise = new Promise((resolve) => {
    resolv = resolve
  })

  await t.notThrowsAsync(async () => {
    await importLocation(
      makeFakeReadFor(transformed),
      'file://location/index.mjs',
      {
        globals: {
          console,
          dynamicCallback: () => {
            resolv()
          },
        },
      }
    )
  })
  return { dynamicImportPromise }
}

test('syncModuleTransforms.mjs - combined transformations produce valid code 1', async (t) => {
  await testTransformAgainstEndo(
    t,
    `#!/usr/bin/env node
const result = eval("1 + 1");
eval("foo"); eval("bar");
const item = [1,1,1];
var a,b,c,d;
a=b=c=d=2;
if (item[1]--> b) {}
if (a--> 0) {}
if (a--> b && c--> d) {}
`
  )
})

test('syncModuleTransforms.mjs - combined transformations produce valid code 2', async (t) => {
  const { dynamicImportPromise } = await testTransformAgainstEndo(
    t,
    `//<!-- this is a comment -->
const result = eval("1 + 1");
'dynamic import()';
\`template import()\`;
console.log();
// NOTE: dynamic.mjs is a name matching a dummy location in makeFakeReadFor
const x = import("./dynamic.mjs"); "import()";
`
  )
  await dynamicImportPromise
})
