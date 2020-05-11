// this is an integration test
// focusing on TypedArrays
// between native Buffer and keccak's native modules
// and also coincidently keccak's classes inheriting
// from core stream's function class Transform that uses
// an instanceof check for flexible use of the "new" keyword
// that can accidently trigger a constructor return override

const { Buffer } = require('buffer')
const createKeccakHash = require('keccak')

const result = getHash('abcdef1234567890')
console.log(`keccak256: ${result}`)

function getHash (inputHexString) {
  return createKeccakHash('keccak256')
    .update(Buffer.from(inputHexString, 'hex'))
    .digest()
    .toString('hex')
}
