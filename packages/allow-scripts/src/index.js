const { promises: fs } = require('fs')
const path = require('path')
const npmRunScript = require('@npmcli/run-script')
const { loadCanonicalNameMap } = require('@lavamoat/aa')

module.exports = {
  runAllowedPackages,
  setDefaultConfiguration,
  printPackagesList,
}

async function runAllowedPackages ({ rootDir }) {
  const {
    packagesWithLifecycleScripts,
    allowedPatterns,
    missingPolicies
  } = await loadAllPackageConfigurations({ rootDir })

  if (missingPolicies.length) {
    console.log('\n@lavamoat/allow-scripts has detected dependencies without configuration. explicit configuration required.')
    console.log('run "allow-scripts auto" to automatically populate the configuration.\n')

    console.log('packages missing configuration:')
    missingPolicies.forEach(pattern => {
      const collection = packagesWithLifecycleScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })

    // exit with error
    process.exit(1)
  }

  // run scripts in dependencies
  if (allowedPatterns.length) {
    const allowedPackagesWithLifecycleScripts = [].concat(...Array.from(packagesWithLifecycleScripts.entries())
      .filter(([pattern]) => allowedPatterns.includes(pattern))
      .map(([, packages]) => packages)
    )

    console.log('running lifecycle scripts for event "preinstall"')
    await runAllScriptsForEvent({ event: 'preinstall', packages: allowedPackagesWithLifecycleScripts })
    console.log('running lifecycle scripts for event "install"')
    await runAllScriptsForEvent({ event: 'install', packages: allowedPackagesWithLifecycleScripts })
    console.log('running lifecycle scripts for event "postinstall"')
    await runAllScriptsForEvent({ event: 'postinstall', packages: allowedPackagesWithLifecycleScripts })
  } else {
    console.log('no allowed scripts found in configuration')
  }

  // run scripts in top-level package
  console.log('running lifecycle scripts for top level package')
  await runScript({ event: 'install', path: rootDir })
  await runScript({ event: 'postinstall', path: rootDir })
  await runScript({ event: 'prepublish', path: rootDir })
  await runScript({ event: 'prepare', path: rootDir })
}

async function runAllScriptsForEvent ({ event, packages }) {
  for (const { canonicalName, path, scripts } of packages) {
    if (event in scripts) {
      console.log(`- ${canonicalName}`)
      await runScript({ path, event })
    }
  }
}

async function runScript ({ path, event }) {
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

async function setDefaultConfiguration ({ rootDir }) {
  const {
    packageJson,
    allowScriptsConfig,
    missingPolicies,
    excessPolicies
  } = await loadAllPackageConfigurations({ rootDir })

  console.log('\n@lavamoat/allow-scripts automatically updating configuration')

  if (!missingPolicies.length && !excessPolicies.length) {
    console.log('\nconfiguration looks good as is, no changes necesary')
    return
  }

  if (missingPolicies.length) {
    console.log('\nadding configuration for missing packages:')
    missingPolicies.forEach(pattern => {
      console.log(`- ${pattern}`)
      allowScriptsConfig[pattern] = false
    })
  }

  // update package json
  if (!packageJson.lavamoat) packageJson.lavamoat = {}
  packageJson.lavamoat.allowScripts = allowScriptsConfig
  const packageJsonPath = path.resolve(rootDir, 'package.json')
  const packageJsonSerialized = JSON.stringify(packageJson, null, 2) + '\n'
  await fs.writeFile(packageJsonPath, packageJsonSerialized)
}

async function printPackagesList ({ rootDir }) {
  const {
    packagesWithLifecycleScripts,
    allowedPatterns,
    disallowedPatterns,
    missingPolicies,
    excessPolicies
  } = await loadAllPackageConfigurations({ rootDir })

  console.log('\n# allowed packages')
  if (allowedPatterns.length) {
    allowedPatterns.forEach(pattern => {
      const collection = packagesWithLifecycleScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  console.log('\n# disallowed packages')
  if (disallowedPatterns.length) {
    disallowedPatterns.forEach(pattern => {
      const collection = packagesWithLifecycleScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  if (missingPolicies.length) {
    console.log('\n# unconfigured packages!')
    missingPolicies.forEach(pattern => {
      const collection = packagesWithLifecycleScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }

  if (excessPolicies.length) {
    console.log('\n# packages that dont need configuration (missing or no lifecycle scripts)')
    excessPolicies.forEach(pattern => {
      const collection = packagesWithLifecycleScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }
}

async function loadAllPackageConfigurations ({ rootDir }) {
  const packagesWithLifecycleScripts = new Map()

  const dependencyMap = await loadCanonicalNameMap({ rootDir, includeDevDeps: true })
  const sortedDepEntries = Array.from(dependencyMap.entries()).sort(sortBy(([filePath, canonicalName]) => canonicalName))
  for (const [filePath, canonicalName] of sortedDepEntries) {
    // const canonicalName = getCanonicalNameForPath({ rootDir, filePath: filePath })
    let depPackageJson
    try {
      depPackageJson = JSON.parse(await fs.readFile(path.join(filePath, 'package.json')))
    } catch (err) {
      const branchIsOptional = branch.some(node => node.optional)
      if (err.code === 'ENOENT' && branchIsOptional) {
        continue
      }
      throw err
    }
    const depScripts = depPackageJson.scripts || {}
    const lifeCycleScripts = ['preinstall', 'install', 'postinstall'].filter(name => Object.prototype.hasOwnProperty.call(depScripts, name))

    if (lifeCycleScripts.length) {
      const collection = packagesWithLifecycleScripts.get(canonicalName) || []
      collection.push({
        canonicalName,
        path: filePath,
        scripts: depScripts
      })
      packagesWithLifecycleScripts.set(canonicalName, collection)
    }
  }

  const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
  const lavamoatConfig = packageJson.lavamoat || {}
  const allowScriptsConfig = lavamoatConfig.allowScripts || {}
  // packages with config
  const configuredPatterns = Object.keys(allowScriptsConfig)

  // select allowed + disallowed
  const allowedPatterns = Object.entries(allowScriptsConfig).filter(([pattern, packageData]) => packageData === true).map(([pattern]) => pattern)
  const disallowedPatterns = Object.entries(allowScriptsConfig).filter(([pattern, packageData]) => packageData === false).map(([pattern]) => pattern)
  const missingPolicies = [...packagesWithLifecycleScripts.keys()]
    .filter(pattern => packagesWithLifecycleScripts.has(pattern))
    .filter(pattern => !configuredPatterns.includes(pattern))
  const excessPolicies = Object.keys(allowScriptsConfig).filter(pattern => !packagesWithLifecycleScripts.has(pattern))

  return {
    packageJson,
    allowScriptsConfig,
    packagesWithLifecycleScripts,
    allowedPatterns,
    disallowedPatterns,
    missingPolicies,
    excessPolicies
  }
}

function sortBy(getterFn) {
  return (a,b) => {
    const aVal = getterFn(a)
    const bVal = getterFn(b)
    if (aVal > bVal) return 1
    else if (aVal < bVal) return -1
    else return 0
  }
}
