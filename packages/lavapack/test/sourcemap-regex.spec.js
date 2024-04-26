const test = require('ava')

// Had to extract this part because node16 got confused and believed the sourcemapping comments inside strings. As a result, AVA would malfunction and create a snapshot called foo.js.
const SRCMAPDEF_STRING = 'sourceMappingURL'
const { sourceMapDropperRegex } = require('../src/pack')

test('sourceMapDropperRegex detects embedded sourcemap', (t) => {
  const singleLineCodeWithSourceMap = `console.log("Hello, world!")
    //# ${SRCMAPDEF_STRING}=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==`
  t.true(
    !!singleLineCodeWithSourceMap.match(sourceMapDropperRegex),
    'Should detect embedded sourcemap'
  )
})

test('sourceMapDropperRegex detects embedded sourcemap with multiline comment', (t) => {
  const singleLineCodeWithSourceMapAndMultilineComment = `console.log("Hello, world!"); 
    /*# ${SRCMAPDEF_STRING}=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ== */`
  t.true(
    !!singleLineCodeWithSourceMapAndMultilineComment.match(
      sourceMapDropperRegex
    ),
    'Should detect embedded sourcemap with multiline comment'
  )
})

test('sourceMapDropperRegex detects embedded sourcemap with multiline comment and code after it', (t) => {
  const multiLineCodeWithSourceMapAndMultilineComment = `function greet() {
  console.log("Hello, world!");
} 
/*# ${SRCMAPDEF_STRING}=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ== */;
var more = 'code';
`
  t.true(
    !!multiLineCodeWithSourceMapAndMultilineComment.match(
      sourceMapDropperRegex
    ),
    'Should detect embedded sourcemap with multiline comment and code after it'
  )
})

test('sourceMapDropperRegex detects embedded sourcemap in code with multiple multiline comments', (t) => {
  const codeWithMultipleMultilineComments = `function greet() {
  console.log("Hello, world!");
} 
/* This is a regular comment */
/*# ${SRCMAPDEF_STRING}=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ== */;
/* This is another regular comment */
var more = 'code';
`

  const modifiedCode = codeWithMultipleMultilineComments.replace(
    sourceMapDropperRegex,
    ''
  )
  t.true(
    modifiedCode.includes('/* This is a regular comment */') &&
      modifiedCode.includes('/* This is another regular comment */'),
    'Should remove only the embedded sourcemap comment'
  )
  t.true(
    !!codeWithMultipleMultilineComments.match(sourceMapDropperRegex),
    'Should detect embedded sourcemap in code with multiple multiline comments'
  )
})

test('sourceMapDropperRegex detects embedded sourcemap in code with malformed multiline comments', (t) => {
  const codeWithMultipleMultilineComments = `function greet() {
  console.log("Hello, world!");
} 
/* This is a regular comment */
/*# ${SRCMAPDEF_STRING}=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ== 

stuff
*/
`
  const modifiedCode = codeWithMultipleMultilineComments.replace(
    sourceMapDropperRegex,
    ''
  )
  t.not(modifiedCode, codeWithMultipleMultilineComments)
  t.snapshot(modifiedCode)
})

test('sourceMapDropperRegex does not detect embedded sourcemap in code without sourcemap', (t) => {
  const codeWithoutSourceMap = 'console.log("Hello, world!");'
  t.false(
    !!codeWithoutSourceMap.match(sourceMapDropperRegex),
    'Should not detect embedded sourcemap in code without sourcemap'
  )
})
