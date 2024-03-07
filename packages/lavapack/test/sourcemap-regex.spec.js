const test = require('ava')

const { sourceMapDropperRegex } = require('../src/pack')

test('sourceMapDropperRegex detects embedded sourcemap in single line code', (t) => {
  const singleLineCodeWithSourceMap =
    'console.log("Hello, world!"); //# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ=='
  t.true(
    !!singleLineCodeWithSourceMap.match(sourceMapDropperRegex),
    'Should detect embedded sourcemap in single line code'
  )
})

test('sourceMapDropperRegex detects embedded sourcemap in multi-line code', (t) => {
  const multiLineCodeWithSourceMap = `function greet() {
  console.log("Hello, world!");
} 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0LmpzIiwic291cmNlcyI6WyJmb28uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEifQ==;
var more = 'code';
`
  t.true(
    !!multiLineCodeWithSourceMap.match(sourceMapDropperRegex),
    'Should detect embedded sourcemap in multi-line code'
  )
})

// TODO: same but with /**/ syntax