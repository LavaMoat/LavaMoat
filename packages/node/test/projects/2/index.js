const createKeccakHash = require('keccak')

const result = getHash('abcdef1234567890')
console.log(`keccak256: ${result}`)

function getHash (inputHexString) {
  return createKeccakHash(`keccak256`)
    .update(Buffer.from(inputHexString, 'hex'))
    .digest()
    .toString('hex')
}