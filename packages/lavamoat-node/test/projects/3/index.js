// this is an integration test
// focusing on TypedArrays
// between global Buffer and core crypto

const { action } = require('a')

const result = action()

console.log(`sha256: ${result.toString('hex')}`)
