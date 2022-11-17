const promptly = require('promptly')
const {
  patchPackageJson,
  writeRcFile,
} = require('@lavamoat/allow-scripts/setup')
const {
  getPackageJson,
} = require('./utils')

module.exports = async function setupScripts(pkgManager) {
  const pkgConf = getPackageJson()
  if (pkgConf.scripts['lavamoat-postinstall']) {
    console.warn('Existing script `lavamoat-postinstall` detected. This is indicative of inconsistently configured LavaMoat')

    if(!(await promptly.confirm('Would you like to override the existing script?'))) {
      throw new Error('User exit');
    }
  }

  // Generate the RC files setup
  writeRcFile(pkgManager)

  patchPackageJson()
}
