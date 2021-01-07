const createKeccakHash = require('keccak')
testResult.value = createKeccakHash('keccak256').digest().toString('hex')