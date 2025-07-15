require('ses')

lockdown({
  overrideTaming: 'severe',
  // overrideDebug: ['toString']
})

console.log('This is an example of issues that occur under SES lockdown')

try {
  require('./src/poly.js')
} catch (er) {
  console.error(er)
}
try {
  require('./src/maths.js')
} catch (er) {
  console.error(er)
}
try {
  // only works in sloppy mode anyway
  globalThis.a = 1
  const globals = new Function('return this')()
  const extractedA = globals.a
} catch (er) {
  console.error(er)
}

try {
  // Note that in sloppy mode overriding a frozen property fails silently.
  // We are getting the override errors only if the code is in strict mode
  // that's how JavaScript spec says it works.
  const a = {}
  a.field = 1
  a.toString = function nothing() {}
  Object.freeze(a)
  a.field = 2
  assert.equal(a.field, 2)
} catch (er) {
  console.error(er)
}
