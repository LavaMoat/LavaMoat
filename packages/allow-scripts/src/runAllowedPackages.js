/**
 * runAllowedPackages function
 *
 * @module
 */
const path = require('node:path')
const npmRunScript = require('@npmcli/run-script')
const { loadAllPackageConfigurations } = require('./config.js')
const { linkBinAbsolute, linkBinRelative } = require('./linker.js')
const { printMissingPoliciesIfAny } = require('./report.js')
const { FEATURE } = require('./toggles.js')

/**
 * @param {RunAllowedPackagesParams} params
 * @returns {Promise<void>}
 */
async function runAllowedPackages({ rootDir }) {
  const {
    configs: { lifecycle, bin },
    somePoliciesAreMissing,
  } = await loadAllPackageConfigurations({ rootDir })

  if (somePoliciesAreMissing) {
    console.log(
      '\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required.'
    )
    console.log(
      'run "allow-scripts auto" to automatically populate the configuration.\n'
    )

    printMissingPoliciesIfAny(lifecycle)

    // exit with error
    process.exit(1)
  }

  if (FEATURE.bins && bin.allowConfig) {
    // Consider: Might as well delete entire .bin and recreate in case it was left there
    // install bins
    if (bin.binCandidates.size > 0) {
      console.log('installing bin scripts')
      await installBinScripts(bin.allowedBins)
      await installBinFirewall(
        bin.firewalledBins,
        path.join(__dirname, './whichbin.js')
      )
    } else {
      console.log('no bin scripts found in dependencies')
    }
  }

  // run scripts in dependencies
  if (lifecycle.allowedPatterns.length) {
    const allowedPackagesWithScriptsLifecycleScripts = Array.from(
      lifecycle.packagesWithScripts.entries()
    )
      .filter(([pattern]) => lifecycle.allowedPatterns.includes(pattern))
      .flatMap(([, packages]) => packages)

    console.log('running lifecycle scripts for event "preinstall"')
    await runAllScriptsForEvent({
      event: 'preinstall',
      packages: allowedPackagesWithScriptsLifecycleScripts,
    })
    console.log('running lifecycle scripts for event "install"')
    await runAllScriptsForEvent({
      event: 'install',
      packages: allowedPackagesWithScriptsLifecycleScripts,
    })
    console.log('running lifecycle scripts for event "postinstall"')
    await runAllScriptsForEvent({
      event: 'postinstall',
      packages: allowedPackagesWithScriptsLifecycleScripts,
    })
  } else {
    console.log('no allowed lifecycle scripts found in configuration')
  }

  // run scripts in top-level package
  console.log('running lifecycle scripts for top level package')
  await runScript({ event: 'install', path: rootDir })
  await runScript({ event: 'postinstall', path: rootDir })
  await runScript({ event: 'prepublish', path: rootDir })
  // TODO: figure out if we should be doing this:
  await runScript({ event: 'prepare', path: rootDir })
}

// internals

/**
 * @param {Object} arg
 * @param {string} arg.event
 * @param {PkgInfo[]} arg.packages
 */
async function runAllScriptsForEvent({ event, packages }) {
  for (const { canonicalName, path, scripts } of packages) {
    if (event in scripts) {
      console.log(`- ${canonicalName}`)
      await runScript({ path, event })
    }
  }
}

/**
 * @param {BinInfo[]} allowedBins
 * @returns {Promise<void>}
 */
async function installBinScripts(allowedBins) {
  for (const { bin, path, link, canonicalName } of allowedBins) {
    console.log(`- ${bin} - from package: ${canonicalName}`)
    await linkBinRelative({ path, bin, link, force: true })
  }
}
/**
 * Points all bins on the list to whichbin.js cli app from allow-scripts
 *
 * @param {BinInfo[]} firewalledBins
 * @param {string} link - Absolute path to the whichbin.js script
 * @returns {Promise<void>}
 */
async function installBinFirewall(firewalledBins, link) {
  // Note how we take the path of the original package so that the bin is added at the appropriate level of node_modules nesting
  for (const { bin, path: packagePath } of firewalledBins) {
    await linkBinAbsolute({ path: packagePath, bin, link, force: true })
  }
}

/**
 * @param {RunScriptParams} params
 * @returns {Promise<void>}
 */
async function runScript({ path, event }) {
  await npmRunScript({
    // required, the script to run
    // event: 'install',
    event,
    // required, the folder where the package lives
    // path: '/path/to/package/folder',
    path,
    // optional, defaults to false
    // return stdout and stderr as strings rather than buffers
    stdioString: true,
  })
}

module.exports = runAllowedPackages
