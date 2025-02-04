// this is an integration test
// it's covering the partial support of dynamic require

const { performDynamicRequire } = require('a')

console.log(JSON.stringify(performDynamicRequire('b')))
