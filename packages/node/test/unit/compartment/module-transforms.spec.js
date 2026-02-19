import test from 'ava'
import 'ses'
import { useLocalTransforms } from '../../../src/compartment/module-transforms.js'

import { importLocation } from '@endo/compartment-mapper'

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

test('useLocalTransforms - evade comments - transforms decrement operator in comparison', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'if (item[1]--> b)'
    ),
    'if (item[1]-- > b)'
  )
})

test('useLocalTransforms - evade comments - handles variable names', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'if (count--> 0)'
    ),
    'if (count-- > 0)'
  )
})

test('useLocalTransforms - evade comments - handles multiple occurrences', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'if (a--> b && c--> d)'
    ),
    'if (a-- > b && c-- > d)'
  )
})

test('useLocalTransforms - evade comments - complete comment', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      '<!-- this is a comment -->'
    ),
    '< ! -- this is a comment -- >'
  )
})

test('useLocalTransforms - evadeImportString - handles single quotes', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      "'dynamic import()"
    ),
    "'dynamic import（)"
  )
})

test('useLocalTransforms - evadeImportString - handles complex text', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      "Text, explaiing \"things\", (stuff) and import()"
    ),
    "Text, explaiing \"things\", (stuff) and import（)"
  )
})

test('useLocalTransforms - evadeImportString - handles backticks', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      '`template import()`'
    ),
    '`template import（)`'
  )
})

test('useLocalTransforms - evadeImportString - only affects strings', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      'const x = import("module"); "import()"'
    ),
    'const x = import("module"); "import（)"'
  )
})

test('useLocalTransforms - evadeImportString - handles multiple occurrences in string', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      '"import() and import()"'
    ),
    '"import（) and import（)"'
  )
})

test('useLocalTransforms - evadeImportString - replaces import( in strings with spread operator', (t) => {
  t.is(
    useLocalTransforms(
      // ---
      '"some string...import();"'
    ),
    '"some string...import（);"'
  )
})

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
  const transformed = useLocalTransforms(input)

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

test('useLocalTransforms - combined transformations produce valid code 1', async (t) => {
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

test('useLocalTransforms - combined transformations produce valid code 2', async (t) => {
  const { dynamicImportPromise } = await testTransformAgainstEndo(
    t,
    `//<!-- this is a comment -->
const result = eval("1 + 1");
'dynamic import()';
\`template import()\`;
console.log("hello");
// NOTE: dynamic.mjs is a name matching a dummy location in makeFakeReadFor
const x = import("./dynamic.mjs"); "import()";
`
  )
  await dynamicImportPromise
})

test('useLocalTransforms - combined transformations produce valid code 3', async (t) => {
  await testTransformAgainstEndo(
    t,
    `//currently broken
"import() and import()"
"some string...import();";
`
  )
})
