// @ts-check
// @ts-ignore: Object is possibly 'undefined'.
const { promises: fs } = require('fs')
const path = require('path')
const npmRunScript = require('@npmcli/run-script')
const normalizeBin = require('npm-normalize-package-bin')
const { linkBinAbsolute, linkBinRelative } = require('./linker.js')
const { FEATURE } = require('./toggles.js')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const setup = require('./setup')

/**
 * @typedef {Object} PkgConfs
 * @property {Object} packageJson
 * @property {Object} configs
 * @property {ScriptsConfig} configs.lifecycle
 * @property {BinsConfig} configs.bin
 * @property {boolean} somePoliciesAreMissing
 *
 * Individual package info 
 * @typedef {Object} PkgInfo
 * @property {string} canonicalName
 * @property {string} path
 * @property {Object} scripts
 *
 * Individual bin link info 
 * @typedef {Object} BinInfo
 * @property {string} canonicalName
 * @property {boolean} isDirect
 * @property {string} bin
 * @property {string} path
 * @property {string} link
 * @property {string} fullLinkPath
 *
 * Configuration for a type of scripts policies
 * @typedef {Object} ScriptsConfig
 * @property {Object} allowConfig
 * @property {Map<string,[PkgInfo]>} packagesWithScripts
 * @property {Array} allowedPatterns
 * @property {Array} disallowedPatterns
 * @property {Array} missingPolicies
 * @property {Array} excessPolicies
 *
 * @typedef {Map<string,[BinInfo]>} BinCandidates 
 *
 * Configuration for a type of bins policies
 * @typedef {Object} BinsConfig
 * @property {Object} allowConfig
 * @property {BinCandidates} binCandidates
 * @property {Array<BinInfo>} allowedBins
 * @property {Array<BinInfo>} firewalledBins
 * @property {Array} excessPolicies
 * @property {boolean} somePoliciesAreMissing
 */

module.exports = {
  getOptionsForBin,
  runAllowedPackages,
  setDefaultConfiguration,
  printPackagesList,
  setup,
}

async function getOptionsForBin({ rootDir, name }) {
  const {
    configs: {
      bin: {
        binCandidates,
      },
    },
  } = await loadAllPackageConfigurations({ rootDir })

  return binCandidates.get(name)
}


async function runAllowedPackages({ rootDir }) {
  const {
    configs: {
      lifecycle,
      bin,
    },
    somePoliciesAreMissing,
  } = await loadAllPackageConfigurations({ rootDir })

  if (somePoliciesAreMissing) {
    console.log('\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required.')
    console.log('run "allow-scripts auto" to automatically populate the configuration.\n')

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
      await installBinFirewall(bin.firewalledBins, path.join(__dirname, './whichbin.js'))
    } else {
      console.log('no bin scripts found in dependencies')
    }
  }

  // run scripts in dependencies
  if (lifecycle.allowedPatterns.length) {
    const allowedPackagesWithScriptsLifecycleScripts = Array.from(lifecycle.packagesWithScripts.entries())
      .filter(([pattern]) => lifecycle.allowedPatterns.includes(pattern))
      .flatMap(([, packages]) => packages)


    console.log('running lifecycle scripts for event "preinstall"')
    await runAllScriptsForEvent({ event: 'preinstall', packages: allowedPackagesWithScriptsLifecycleScripts })
    console.log('running lifecycle scripts for event "install"')
    await runAllScriptsForEvent({ event: 'install', packages: allowedPackagesWithScriptsLifecycleScripts })
    console.log('running lifecycle scripts for event "postinstall"')
    await runAllScriptsForEvent({ event: 'postinstall', packages: allowedPackagesWithScriptsLifecycleScripts })
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

async function setDefaultConfiguration({ rootDir }) {
  const conf = await loadAllPackageConfigurations({ rootDir })
  const {
    configs: {
      lifecycle,
      bin,
    },
    somePoliciesAreMissing,
  } = conf

  console.log('\n@lavamoat/allow-scripts automatically updating configuration')

  if (!somePoliciesAreMissing) {
    console.log('\nconfiguration looks good as is, no changes necessary')
    return
  }

  console.log('\nadding configuration:')

  lifecycle.missingPolicies.forEach(pattern => {
    console.log(`- lifecycle ${pattern}`)
    lifecycle.allowConfig[pattern] = false
  })

  if(FEATURE.bins && bin.somePoliciesAreMissing) {
    bin.allowConfig = prepareBinScriptsPolicy(bin.binCandidates)
    console.log(`- bin scripts linked: ${Object.keys(bin.allowConfig).join(',')}`)
  }

  // update package json
  await savePackageConfigurations({
    rootDir,
    conf,
  })
}

async function printPackagesList({ rootDir }) {
  const {
    configs: {
      bin,
      lifecycle,
    },
  } = await loadAllPackageConfigurations({ rootDir })

  printPackagesByBins(bin)
  printPackagesByScriptConfiguration(lifecycle)
}


function printMissingPoliciesIfAny({ missingPolicies = [], packagesWithScripts = new Map() }) {
  if(missingPolicies.length) {
    console.log('packages missing configuration:')
    missingPolicies.forEach(pattern => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }
}

// internals

/**
 * 
 * @param {Object} arg 
 * @param {string} arg.event
 * @param {Array<PkgInfo>} arg.packages
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
 * @param {Array<BinInfo>} allowedBins 
 */
async function installBinScripts(allowedBins) {
  for (const { bin, path, link, canonicalName } of allowedBins) {
    console.log(`- ${bin} - from package: ${canonicalName}`)
    await linkBinRelative({ path, bin, link, force: true })
  }
}
/**
 * Points all bins on the list to whichbin.js cli app from allow-scripts
 * @param {Array<BinInfo>} firewalledBins 
 * @param {string} link - absolute path to the whichbin.js script
 */
async function installBinFirewall(firewalledBins, link) {
  // Note how we take the path of the original package so that the bin is added at the appropriate level of node_modules nesting
  for (const { bin, path: packagePath } of firewalledBins) {
    await linkBinAbsolute({path: packagePath, bin, link, force: true } )
  }
}

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
    // print the package id and script, and the command to be run, like:
    // > somepackage@1.2.3 postinstall
    // > make all-the-things
    // Defaults true when stdio:'inherit', otherwise suppressed
    banner: true,
  })
}


const bannedBins = new Set(['node', 'npm', 'yarn', 'pnpm'])

/**
 * @param {BinCandidates} binCandidates 
 */
function prepareBinScriptsPolicy(binCandidates) {
  const policy = {}
  // pick direct dependencies without conflicts and enable them by default unless colliding with bannedBins
  for ( const [bin, infos] of binCandidates.entries()) {
    const binsFromDirectDependencies = infos.filter(i => i.isDirect)
    if(binsFromDirectDependencies.length === 1 && !bannedBins.has(bin)) {
      // there's no conflicts, seems fairly obvious choice to put it up
      policy[bin] = binsFromDirectDependencies[0].fullLinkPath
    }
  }
  return policy
}


/**
 * @param {BinsConfig} param0 
 */
function printPackagesByBins({
  allowedBins,
  excessPolicies,
}) {

  console.log('\n# allowed packages with bin scripts')
  if (allowedBins.length) {
    allowedBins.forEach(({ canonicalName, bin }) => {
      console.log(`- ${canonicalName} [${bin}]`)
    })
  } else {
    console.log('  (none)')
  }

  if (excessPolicies.length) {
    console.log('\n# packages with bin scripts that no longer need configuration (package or script removed or script path outdated)')
    excessPolicies.forEach(bin => {
      console.log(`- ${bin}`)
    })
  }
}

/**
 * @param {ScriptsConfig} param0 
 */
function printPackagesByScriptConfiguration({
  packagesWithScripts,
  allowedPatterns,
  disallowedPatterns,
  missingPolicies,
  excessPolicies,
}) {

  console.log('\n# allowed packages with lifecycle scripts')
  if (allowedPatterns.length) {
    allowedPatterns.forEach(pattern => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  console.log('\n# disallowed packages with lifecycle scripts')
  if (disallowedPatterns.length) {
    disallowedPatterns.forEach(pattern => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  if (missingPolicies.length) {
    console.log('\n# unconfigured packages with lifecycle scripts')
    missingPolicies.forEach(pattern => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }

  if (excessPolicies.length) {
    console.log('\n# packages with lifecycle scripts that no longer need configuration due to package or scripts removal')
    excessPolicies.forEach(pattern => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }
}

/**
 * 
 * @param {Object} args 
 * @param {string} args.rootDir
 * @param {PkgConfs} args.conf
 * @returns {Promise}
 */
async function savePackageConfigurations({ rootDir, conf: {
  packageJson,
  configs: { lifecycle, bin },
} }) {
  // update package json
  if (!packageJson.lavamoat) {
    packageJson.lavamoat = {}
  }
  packageJson.lavamoat.allowScripts = lifecycle.allowConfig
  packageJson.lavamoat.allowBins = bin.allowConfig
  const packageJsonPath = path.resolve(rootDir, 'package.json')
  const packageJsonSerialized = JSON.stringify(packageJson, null, 2) + '\n'
  await fs.writeFile(packageJsonPath, packageJsonSerialized)
}

/**
 * 
 * @param {Object} args 
 * @param {string} args.rootDir
 * @returns {Promise<PkgConfs>}
 */
async function loadAllPackageConfigurations({ rootDir }) {
  const packagesWithScriptsLifecycle = new Map()
  const binCandidates = new Map()

  const dependencyMap = await loadCanonicalNameMap({ rootDir, includeDevDeps: true })
  const sortedDepEntries = Array.from(dependencyMap.entries()).sort(sortBy(([filePath, canonicalName]) => canonicalName))
  const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
  const directDeps = new Set([...Object.keys(packageJson.devDependencies||{}),...Object.keys(packageJson.dependencies||{})])

  for (const [filePath, canonicalName] of sortedDepEntries) {
    // const canonicalName = getCanonicalNameForPath({ rootDir, filePath: filePath })
    let depPackageJson
    try {
      depPackageJson = JSON.parse(await fs.readFile(path.join(filePath, 'package.json'), 'utf-8'))
    } catch (err) {
      // FIXME: leftovers of code that used to work
      // const branchIsOptional = branch.some(node => node.optional)
      // if (err.code === 'ENOENT' && branchIsOptional) {
      //   continue
      // }
      throw err
    }
    const depScripts = depPackageJson.scripts || {}
    const lifeCycleScripts = ['preinstall', 'install', 'postinstall'].filter(name => Object.prototype.hasOwnProperty.call(depScripts, name))

    if (lifeCycleScripts.length) {
      const collection = packagesWithScriptsLifecycle.get(canonicalName) || []
      collection.push({
        canonicalName,
        path: filePath,
        scripts: depScripts,
      })
      packagesWithScriptsLifecycle.set(canonicalName, collection)
    }

    if (FEATURE.bins && depPackageJson.bin) {
      const binsList = Object.entries(normalizeBin(depPackageJson)?.bin || {})

      binsList.forEach(([name, link]) => {
        const collection = binCandidates.get(name) || []
        if (collection.length === 0) {
          binCandidates.set(name, collection)
        }
        collection.push({
          // canonical name for a direct dependency is just dependency name
          isDirect: directDeps.has(canonicalName), 
          bin: name,
          path: filePath,
          link,
          fullLinkPath: path.relative(rootDir,path.join(filePath, link)),
          canonicalName,
        })
      })
    }
  }

  const lavamoatConfig = packageJson.lavamoat || {}

  const configs = {
    lifecycle: indexLifecycleConfiguration({
      packagesWithScripts: packagesWithScriptsLifecycle,
      allowConfig: lavamoatConfig.allowScripts,
    }),
    bin: indexBinsConfiguration({
      binCandidates,
      allowConfig: lavamoatConfig.allowBins,
    }),
  }

  const somePoliciesAreMissing = !!(configs.lifecycle.missingPolicies.length || configs.bin.somePoliciesAreMissing)

  return {
    packageJson,
    configs,
    somePoliciesAreMissing,
  }
}

/**
 * Adds helpful redundancy to the config object thus producing a full ScriptsConfig type
 * @param {*} config
 * @return {ScriptsConfig}
 */
function indexLifecycleConfiguration(config) {
  config.allowConfig = config.allowConfig || {}
  // packages with config
  const configuredPatterns = Object.keys(config.allowConfig)
  // select allowed + disallowed
  config.allowedPatterns = Object.entries(config.allowConfig).filter(([pattern, packageData]) => !!packageData).map(([pattern]) => pattern)

  config.disallowedPatterns = Object.entries(config.allowConfig).filter(([pattern, packageData]) => !packageData).map(([pattern]) => pattern)

  config.missingPolicies = Array.from(config.packagesWithScripts.keys())
    .filter(pattern => !configuredPatterns.includes(pattern))

  config.excessPolicies = configuredPatterns.filter(pattern => !config.packagesWithScripts.has(pattern))

  return config
}

/**
 * Adds helpful redundancy to the config object thus producing a full ScriptsConfig type
 * @param {*} config
 * @return {BinsConfig}
 */
function indexBinsConfiguration(config) {
  // only autogenerate the initial config. A better heuristic would be to detect if any scripts from direct dependencies are missing
  config.somePoliciesAreMissing = !config.allowConfig && config.binCandidates.size > 0
  config.excessPolicies = Object.keys(config.allowConfig || {}).filter(b => !config.binCandidates.has(b))
  config.allowedBins = Object.entries(config.allowConfig || {}).map(([bin, fullPath]) => config.binCandidates.get(bin)?.find((/** @type BinInfo */ candidate) => candidate.fullLinkPath === fullPath)).filter(a => a)

  config.firewalledBins = Array.from(config.binCandidates.values()).flat().filter(binInfo => !config.allowedBins.includes(binInfo))
  return config
}

function sortBy(getterFn) {
  return (a, b) => {
    const aVal = getterFn(a)
    const bVal = getterFn(b)
    if (aVal > bVal) {
      return 1
    } else if (aVal < bVal) {
      return -1
    } else {
      return 0
    }
  }
}
