const promptly = require('promptly')
const {
  patchPackageJson,
  writeRcFile,
} = require('@lavamoat/allow-scripts/setup')
const {
  getPackageJson,
} = require('./utils')

const { isDryRun } = require('./effect')

module.exports = async function setupScripts({interactive, force, packageManager}) {
  const pkgConf = getPackageJson()
  if (pkgConf.scripts['lavamoat-postinstall']) {
    console.warn('Existing script `lavamoat-postinstall` detected. This is indicative of inconsistently configured LavaMoat')
    if (interactive && !force && !(await promptly.confirm('Would you like to override the existing script? [y/n]'))) {
      throw new Error('User exit')
    } else if (!interactive) {
      throw new Error('Not overwriting existing script')
    }
  }

  // Generate the RC files setup
  writeRcFile(packageManager, isDryRun())

  patchPackageJson(isDryRun())
}
