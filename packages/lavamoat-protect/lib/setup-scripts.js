const {writeRcFile} = require('@lavamoat/allow-scripts/setup')
const {
  getPackageJson,
  writePackageJson,
} = require('./utils')
const promptly = require('promptly')
module.exports = async function setupScripts(pkgManager){
  const pkgConf = getPackageJson()
  if (pkgConf.scripts) {
    // TODO: check conflicts, existing stuff?
  }

  if(!pkgConf.scripts) {
    pkgConf.scripts = {}
  }

  if (pkgConf.scripts['lavamoat-postinstall']) {    
    console.warn('Existing script `lavamoat-postinstall` detected. This is indicative of inconsistently configured LavaMoat')
    
    if(!(await promptly.confirm('Would you like to override the existing script?'))) {
      throw new Error('User exit');
    }
  }

  pkgConf.scripts['lavamoat-postinstall'] = './node_modules/@lavamoat/allow-scripts/src/cli.js'

  // Generate the RC files setup
  writeRcFile(pkgManager)


  // Install dev dependency to fail the installation process
  if(!pkgConf.devDependencies) {
    pkgConf.devDependencies = {}
  }
  // TODO: do we want to avoid installing it for yarn3 since it doesn't help there?
  // TODO: reconsider the version specifier in a larger group...
  // TODO: do we want to move it back to the allow-scripts setup?
  pkgConf.devDependencies['@lavamoat/preinstall-always-fail'] = 'latest'
  writePackageJson(pkgConf)
}