const { ParseLockfile, ValidateScheme } = require('lockfile-lint-api')
const { ValidateGitUrl } = require('./validate-git')
const crypto = require('node:crypto')

const checksum = (input) =>
  crypto.createHash('md5').update(input).digest('hex').substring(0, 8)

const makeValidator = (packages) => async (Validator, options) => {
  const validator = new Validator({ packages })
  const result = await validator.validate(options)
  const validatorName = Validator.prototype.constructor.name
  if (result.type !== 'success') {
    result.errors.forEach((e) => {
      e.validator = validatorName
    })
    return result.errors
  } else {
    return []
  }
}

const validatePackages = async (packages) => {
  const runValidator = makeValidator(packages)

  return Promise.all([
    runValidator(ValidateScheme, [
      'npm:',
      'https:',
      'git+https:',
      'patch:',
      'workspace:',
    ]),
    runValidator(ValidateGitUrl),
  ]).then((results) => results.flat())
}

exports.validatePackages = validatePackages

exports.validateLockfile = async ({ lockfilePath, type }) => {
  const parser = new ParseLockfile({ lockfilePath, lockfileType: type })
  const lockfile = parser.parseSync()
  const packages = lockfile.object
  const results = await validatePackages(packages)
  results.forEach((result) => {
    result.id = `${result.package}:${checksum(result.validator + result.message)}`
  })
  return results
}
