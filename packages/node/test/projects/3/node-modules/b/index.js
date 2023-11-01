const crypto = require('crypto')

function performHash(input) {
  if (!Buffer.isBuffer(input)) throw new Error('expected a buffer for input')
  return crypto.createHash('sha256').update(input).digest()
}

module.exports = { performHash }
