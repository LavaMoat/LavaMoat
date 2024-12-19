const { ParseLockfile, ValidateScheme } = require('lockfile-lint-api')
const { ValidateGitUrl } = require('./validate-git')

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

const validatePackages = async (packages, knownDirectDependencies) => {
  const runValidator = makeValidator(packages)

  return Promise.all([
    runValidator(ValidateScheme, [
      'npm:',
      'https:',
      'git+https:',
      'git+ssh:',
      'git:',
      'patch:',
      'workspace:',
    ]),
    runValidator(ValidateGitUrl, knownDirectDependencies),
  ]).then((results) => results.flat())
}

exports.validatePackages = validatePackages

exports.validateLockfile = async ({
  lockfilePath,
  type,
  knownDirectDependencies,
}) => {
  const parser = new ParseLockfile({ lockfilePath, lockfileType: type })
  const lockfile = parser.parseSync()
  const packages = lockfile.object
  const results = await validatePackages(packages, knownDirectDependencies)

  return results
}
