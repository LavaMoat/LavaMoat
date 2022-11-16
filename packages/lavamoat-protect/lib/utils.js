//@ts-check
const { readFileSync, writeFileSync } = require('fs')
const path = require('path')

let packageJsonCache

const projectRelative = (relativePath) =>
  path.join(process.cwd(), relativePath)

const getPackageJson = () => {
  if (!packageJsonCache) {
    const pkgstr = readFileSync(projectRelative('package.json'), 'utf-8')
    try {
      packageJsonCache = JSON.parse(pkgstr)
    } catch(e) {
      console.error('Failed to parse package.json :(', e)
    }
  }
  return packageJsonCache
}

const writePackageJson = (data) => {
  if (!packageJsonCache) {
    throw Error('package.json overwrite attempted prior to reading')
  }
  try {
    writeFileSync(projectRelative('package.json'), JSON.stringify(data, null, 2), { encoding: 'utf-8' })
  } catch(e) {
    console.error('Failed to write package.json ;(')
    throw e
  }
}

module.exports = {
  getPackageJson,
  projectRelative,
  writePackageJson,
}
