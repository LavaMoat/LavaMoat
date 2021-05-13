const test = require('ava')
const pack = require('../')


test('dummy test', (t) => {
  pack({
    includePrelude: false
  })
  t.pass('no error thrown')
})