const { validateLockfile } = require('./lockfile')
const { scanDirectGitDependencies } = require('./package')
const { checksum } = require('./ignore')
const { existsSync } = require('node:fs')
const path = require('node:path')

const sortErrors = (errors) => {
  errors.forEach((result) => {
    result.id = `${result.package}:${checksum(result.validator + result.message)}`
  })
  return errors.sort((a, b) => a.id.localeCompare(b.id))
}

const runAllValidations = async ({ cwd, type }) => {
  let dependencies = {}
  const errors = []
  try {
    const direct = await scanDirectGitDependencies(cwd)
    errors.push(...direct.errors)
    dependencies = direct.dependencies
  } catch (e) {
    errors.push({
      message: e.message,
      package: 'package.json',
      validator: 'packageJson',
    })
  }

  const lockFileOptions = []
  switch (type) {
    case 'yarn':
      lockFileOptions.push('yarn.lock')
      break
    case 'npm':
      lockFileOptions.push('package-lock.json')
      break
    default:
      lockFileOptions.push('yarn.lock', 'package-lock.json')
  }
  const lockFileName = lockFileOptions.find((file) =>
    existsSync(path.join(cwd, file))
  )
  if (!lockFileName) {
    console.error('[lockfile-lint] No lockfile found')
    process.exit(2)
  }
  const lockfilePath = path.join(cwd, lockFileName)

  const lockfileErrors = await validateLockfile({
    lockfilePath,
    type,
    knownDirectDependencies: dependencies,
  })
  errors.push(...lockfileErrors)
  return sortErrors(errors)
}
exports.runAllValidations = runAllValidations
