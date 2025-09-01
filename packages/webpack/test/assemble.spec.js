const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { removeMultilineComments } = require('../src/runtime/assemble')

test('preserves comments inside string literals', (t) => {
  const input = `const str = "This is a /* not a comment */ string";`
  const expected = `const str = "This is a /* not a comment */ string";`
  t.is(removeMultilineComments(input), expected)
})

test('preserves comments inside template literals', (t) => {
  const input = `const template = \`This is /* not a comment */ in template\`;`
  const expected = `const template = \`This is /* not a comment */ in template\`;`
  t.is(removeMultilineComments(input), expected)
})

test('preserves comment-like patterns in regex literals', (t) => {
  const input = `const regex = /\\/\\*.*?\\*\\//g;`
  const expected = `const regex = /\\/\\*.*?\\*\\//g;`
  t.is(removeMultilineComments(input), expected)
})

test('removes actual comments between code', (t) => {
  const input = `const a = 5; /* comment */ const b = 10;`
  const expected = `const a = 5;  const b = 10;`
  t.is(removeMultilineComments(input), expected)
})

test('removes multiline comments', (t) => {
  const input = `const a = 5;
/* This is a
   multiline
   comment */
const b = 10;`
  const expected = `const a = 5;

const b = 10;`
  t.is(removeMultilineComments(input), expected)
})

test('handles nested comment syntax correctly', (t) => {
  const input = `/* outer /* inner */ const a = 5;`
  const expected = ` const a = 5;`
  t.is(removeMultilineComments(input), expected)
  // Note: JS doesn't support nested comments, so /* inner */ ends the comment
})

test('preserves URL strings with /* patterns', (t) => {
  const input = `const url = "https://example.com/*";`
  const expected = `const url = "https://example.com/*";`
  t.is(removeMultilineComments(input), expected)
})

test('preserves glob patterns', (t) => {
  const input = `const pattern = "glob/pattern/*.js";`
  const expected = `const pattern = "glob/pattern/*.js";`
  t.is(removeMultilineComments(input), expected)
})

test('removes comments in mathematical expressions', (t) => {
  const input = `const result = 5 /* multiplied by */ * /* two */ 2;`
  const expected = `const result = 5  *  2;`
  t.is(removeMultilineComments(input), expected)
})

test('preserves JSON strings with comment-like content', (t) => {
  const input = `const json = '{"pattern": "/*", "glob": "*.js"}';`
  const expected = `const json = '{"pattern": "/*", "glob": "*.js"}';`
  t.is(removeMultilineComments(input), expected)
})

test('handles multiple comments on same line', (t) => {
  const input = `const a = /* first */ 5 /* second */ + /* third */ 3;`
  const expected = `const a =  5  +  3;`
  t.is(removeMultilineComments(input), expected)
})

test('preserves single-line // comments', (t) => {
  const input = `const a = 5; // this is a single line comment`
  const expected = `const a = 5; // this is a single line comment`
  t.is(removeMultilineComments(input), expected)
})

test('removes JSDoc comments', (t) => {
  const input = `/**
 * This is a JSDoc comment
 * @param {string} x
 */
function foo(x) {}`
  const expected = `
function foo(x) {}`
  t.is(removeMultilineComments(input), expected)
})

test('handles edge case with division and pointer-like syntax', (t) => {
  const input = `const x = a / /* comment */ b;`
  const expected = `const x = a /  b;`
  t.is(removeMultilineComments(input), expected)
})

test('preserves escaped characters in strings', (t) => {
  const input = `const str = "This is \\"/* not a comment */\\" string";`
  const expected = `const str = "This is \\"/* not a comment */\\" string";`
  t.is(removeMultilineComments(input), expected)
})

test('handles comment at start of file', (t) => {
  const input = `/* comment at start */const a = 5;`
  const expected = `const a = 5;`
  t.is(removeMultilineComments(input), expected)
})

test('handles comment at end of file', (t) => {
  const input = `const a = 5;/* comment at end */`
  const expected = `const a = 5;`
  t.is(removeMultilineComments(input), expected)
})

test('handles empty comment', (t) => {
  const input = `const a = /**/ 5;`
  const expected = `const a =  5;`
  t.is(removeMultilineComments(input), expected)
})

test('removes multiline comment inside function closure', (t) => {
  const input = `const fn = (function() {
  /* This is a multiline
     comment inside
     a closure */
  return 42;
})();`
  const expected = `const fn = (function() {
  
  return 42;
})();`
  t.is(removeMultilineComments(input), expected)
})

test('removes multiple comments in nested closures', (t) => {
  const input = `const result = (function outer() {
  /* outer comment */
  return (function inner() {
    /* inner comment */
    return 5;
  })();
})();`
  const expected = `const result = (function outer() {
  
  return (function inner() {
    
    return 5;
  })();
})();`
  t.is(removeMultilineComments(input), expected)
})
