const { readFileSync } = require('node:fs')
const crypto = require('node:crypto')

exports.filterIgnores = function (errors, ignore) {
  if (ignore) {
    const ignores = JSON.parse(readFileSync(ignore, 'utf8'))
    if (!Array.isArray(ignores)) {
      console.error(`[git-safe] ignore file must be an array`)
      process.exit(2)
    }
    errors = errors.filter((e) => {
      if (ignores.includes(e.id)) {
        console.error(`[git-safe] Ignoring: ${e.validator || ''} ${e.id}`)
        return false
      }
      return true
    })
  }
  return errors
}

exports.checksum = (input) =>
  crypto.createHash('md5').update(input).digest('hex').substring(0, 8)
