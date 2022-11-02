// @ts-check
// @ts-ignore: Object is possibly 'undefined'.
const { promises: fs } = require('fs')
const path = require('path')
const npmRunScript = require('@npmcli/run-script')
const npmBinLinks = require('bin-links')
const { loadCanonicalNameMap } = require('@lavamoat/aa')

module.exports = {
  runAllowedPackages,
  setDefaultConfiguration,
  printPackagesList,
}


/**
 * @typedef {Object} PkgConfs
 * @property {Object} packageJson
 * @property {Object} configs
 * @property {ScriptsConfig} configs.lifecycle
 * @property {ScriptsConfig} configs.bin
 * @property {boolean} somePoliciesAreMissing
 */

/**
 * Individual package info 
 * @typedef {Object} PkgInfo
 * @property {string} canonicalName
 * @property {string} path
 * @property {Object} scripts
 * @property {Array} [policyDetails] Optional policyDetails to contain finer than per-package information 
 */

/**
 * Configuration for a type of scripts policies
 * @typedef {Object} ScriptsConfig
 * @property {Object} allowConfig
 * @property {Map<string,[PkgInfo]>} packagesWith
 * @property {Array} allowedPatterns
 * @property {Record<string,any>} allowanceByPattern
 * @property {Array} disallowedPatterns
 * @property {Array} missingPolicies
 * @property {Array} excessPolicies
 */


function printMissingPoliciesIfAny({ missingPolicies = [], packagesWith = new Map() }) {
  missingPolicies.forEach(pattern => {
    const collection = packagesWith.get(pattern) || []
    console.log(`- ${pattern} [${collection.length} location(s)]`)
  })
}
async function runAllowedPackages({ rootDir }) {
  const {
    configs: {
      lifecycle,
      bin
    },
    somePoliciesAreMissing
  } = await loadAllPackageConfigurations({ rootDir })

  if (somePoliciesAreMissing) {
    console.log('\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required.')
    console.log('run "allow-scripts auto" to automatically populate the configuration.\n')

    console.log('packages missing configuration:')
    printMissingPoliciesIfAny(lifecycle)
    printMissingPoliciesIfAny(bin)

    // exit with error
    process.exit(1)
  }

  // Might as well delete entire .bin and recreate in case it was left there
  // install bins
  if (Object.keys(bin.allowanceByPattern).length) {
    const allowedPackagesWithBins = Array.from(bin.packagesWith.entries())
      .filter(([pattern]) => !!bin.allowanceByPattern[pattern])
      .flatMap(([pattern, packages]) => packages.map(p => {
        p.policyDetails = bin.allowanceByPattern[pattern]
        return p
      }))

    console.log('installing bin scripts')
    await installBinScripts({ packages: allowedPackagesWithBins })


  } else {
    console.log('no allowed bin scripts found in configuration')
  }

  // run scripts in dependencies
  if (Object.keys(lifecycle.allowanceByPattern).length) {
    const allowedPackagesWithLifecycleScripts = Array.from(lifecycle.packagesWith.entries())
      .filter(([pattern]) => !!lifecycle.allowanceByPattern[pattern])
      .flatMap(([, packages]) => packages)


    console.log('running lifecycle scripts for event "preinstall"')
    await runAllScriptsForEvent({ event: 'preinstall', packages: allowedPackagesWithLifecycleScripts })
    console.log('running lifecycle scripts for event "install"')
    await runAllScriptsForEvent({ event: 'install', packages: allowedPackagesWithLifecycleScripts })
    console.log('running lifecycle scripts for event "postinstall"')
    await runAllScriptsForEvent({ event: 'postinstall', packages: allowedPackagesWithLifecycleScripts })
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

async function runAllScriptsForEvent({ event, packages }) {
  for (const { canonicalName, path, scripts } of packages) {
    if (event in scripts) {
      console.log(`- ${canonicalName}`)
      await runScript({ path, event })
    }
  }
}
async function installBinScripts({ packages }) {
  for (const { canonicalName, path, policyDetails, scripts } of packages) {
    const filteredBin = Object.entries(policyDetails).filter(([k,v])=>v).reduce((all, [key]) => {
      if (scripts[key]) {
        all[key] = scripts[key]
      }
      return all
    }, {})
    console.log(`- ${canonicalName}`)
    await npmBinLinks({
      path: path,
      pkg: {
        bin: filteredBin
      },
    })
  }
}
async function runAllScriptsForEvent({ event, packages }) {
  for (const { canonicalName, path, scripts } of packages) {
    if (event in scripts) {
      console.log(`- ${canonicalName}`)
      await runScript({ path, event })
    }
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
    banner: true
  })
}

async function setDefaultConfiguration({ rootDir }) {
  const conf = await loadAllPackageConfigurations({ rootDir })
  const {
    configs: {
      lifecycle,
      bin
    },
    somePoliciesAreMissing
  } = conf

  console.log('\n@lavamoat/allow-scripts automatically updating configuration')

  if (!somePoliciesAreMissing) {
    console.log('\nconfiguration looks good as is, no changes necesary')
    return
  }

  console.log('\nadding configuration for missing packages:')

  lifecycle.missingPolicies.forEach(pattern => {
    console.log(`- lifecycle ${pattern}`)
    lifecycle.allowConfig[pattern] = false
  })

  bin.missingPolicies.forEach(pattern => {
    console.log(`- bin ${pattern}`)
    bin.allowConfig[pattern] = prepareBinScriptsPolicy(bin.packagesWith.get(pattern))
  })

  // update package json
  await savePackageConfigurations({
    rootDir,
    conf
  })
}

const bannedBins = new Set(['node', 'npm', 'yarn', 'pnpm']);
function prepareBinScriptsPolicy(packages = []) {
  const bins = Array.from(new Set(packages.flatMap(pkg /** @PkgInfo */ => Object.keys(pkg.scripts || {}))))
  return bins.reduce((all, b ) => {
    all[b] = !bannedBins.has(b)
    return all;
  },{})
}

async function printPackagesList({ rootDir }) {
  const {
    configs: {
      bin,
      lifecycle
    }
  } = await loadAllPackageConfigurations({ rootDir })

  printPackagesByScriptConfiguration('bin scripts', bin)
  printPackagesByScriptConfiguration('lifecycle scripts', lifecycle)
}

function printPackagesByScriptConfiguration(name, {
    packagesWith,
    allowanceByPattern,
    disallowedPatterns,
    missingPolicies,
    excessPolicies
}){

  const allowedPatterns = Object.keys(allowanceByPattern)

  console.log(`\n# allowed packages with ${name}`)
  if (allowedPatterns.length) {
    allowedPatterns.forEach(pattern => {
      const collection = packagesWith.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }
 
  console.log(`\n# disallowed packages with ${name}`)
  if (disallowedPatterns.length) {
    disallowedPatterns.forEach(pattern => {
      const collection = packagesWith.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  if (missingPolicies.length) {
    console.log(`\n# unconfigured packages with ${name}`)
    missingPolicies.forEach(pattern => {
      const collection = packagesWith.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }

  if (excessPolicies.length) {
    console.log(`\n# packages with ${name} that no longer need configuration (package removed or scripts are no more)`)
    excessPolicies.forEach(pattern => {
      const collection = packagesWith.get(pattern) || []
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
  configs: { lifecycle, bin }
} }) {
  // update package json
  if (!packageJson.lavamoat) packageJson.lavamoat = {}
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
  const packagesWithLifecycle = new Map()
  const packagesWithBin = new Map()

  const dependencyMap = await loadCanonicalNameMap({ rootDir, includeDevDeps: true })
  const sortedDepEntries = Array.from(dependencyMap.entries()).sort(sortBy(([filePath, canonicalName]) => canonicalName))

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
      const collection = packagesWithLifecycle.get(canonicalName) || []
      collection.push({
        canonicalName,
        path: filePath,
        scripts: depScripts
      })
      packagesWithLifecycle.set(canonicalName, collection)
    }

    if (depPackageJson.bin) {
      const bins = (typeof depPackageJson.bin === "string") ? { [depPackageJson.name]: depPackageJson.bin } : depPackageJson.bin
      const collection = packagesWithBin.get(canonicalName) || []
      collection.push({
        canonicalName,
        path: filePath,
        scripts: bins
      })
      packagesWithBin.set(canonicalName, collection)
    }
  }

  const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
  const lavamoatConfig = packageJson.lavamoat || {}

  const configs = {
    lifecycle: indexConfiguration({
      packagesWith: packagesWithLifecycle,
      allowConfig: lavamoatConfig.allowScripts || {}
    }),
    bin: indexConfiguration({
      packagesWith: packagesWithBin,
      allowConfig: lavamoatConfig.allowBins || {}
    })
  }


  configs.lifecycle = indexConfiguration(configs.lifecycle)
  configs.bin = indexConfiguration(configs.bin)

  const somePoliciesAreMissing = !!(configs.lifecycle.missingPolicies.length || configs.bin.missingPolicies.length)

  return {
    packageJson,
    configs,
    somePoliciesAreMissing
  }
}

/**
 * Adds helpful redundancy to the config object thus producing a full ScriptsConfig type
 * @param {*} config
 * @return {ScriptsConfig}
 */
function indexConfiguration(config) {
  // packages with config
  const configuredPatterns = Object.keys(config.allowConfig)
  // select allowed + disallowed
  config.allowanceByPattern = Object.fromEntries(Object.entries(config.allowConfig).filter(([pattern, packageData]) => !!packageData))
  config.allowedPatterns = Object.keys(config.allowanceByPattern)

  config.disallowedPatterns = Object.entries(config.allowConfig).filter(([pattern, packageData]) => !packageData).map(([pattern]) => pattern)

  config.missingPolicies = Array.from(config.packagesWith.keys())
    .filter(pattern => !configuredPatterns.includes(pattern))

  config.excessPolicies = configuredPatterns.filter(pattern => !config.packagesWith.has(pattern))

  return config
}

function sortBy(getterFn) {
  return (a, b) => {
    const aVal = getterFn(a)
    const bVal = getterFn(b)
    if (aVal > bVal) return 1
    else if (aVal < bVal) return -1
    else return 0
  }
}
