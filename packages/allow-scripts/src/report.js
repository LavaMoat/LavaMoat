/**
 * Reporting functions
 *
 * @module
 */
const { loadAllPackageConfigurations, applyMigrations } = require('./config.js')

/**
 * @param {object} params
 * @param {string} params.rootDir
 * @returns {Promise<void>}
 */
async function printPackagesList({ rootDir }) {
  const {
    configs: { bin, lifecycle },
  } = await loadAllPackageConfigurations({ rootDir })

  printPackagesByBins(bin)
  printPackagesByScriptConfiguration(lifecycle)
}

/**
 * @param {object} params
 * @param {string} params.rootDir
 * @param {boolean} [params.skipVersions]
 * @returns {Promise<void>}
 */
async function checkPackagesList({ rootDir, skipVersions }) {
  const {
    configs: { lifecycle },
  } = await loadAllPackageConfigurations({ rootDir, skipVersions })

  if (isScriptConfigurationClean(lifecycle, skipVersions)) {
    console.log('allow-scripts - allowlist OK')
  } else {
    console.log(
      'allow-scripts - allowlist needs update. Run "allow-scripts auto" to automatically update the allowlist configuration or "allow-scripts list" for details.'
    )
    process.exitCode = 1
  }
}

/**
 * @param {PrintMissingPoliciesIfAnyParams} params
 */
function printMissingPoliciesIfAny({
  missingPolicies = [],
  packagesWithScripts = new Map(),
}) {
  if (missingPolicies.length) {
    console.log('packages missing configuration:')
    missingPolicies.forEach((pattern) => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }
}

// internals

/**
 * @param {BinsConfig} param0
 */
function printPackagesByBins({ allowedBins, excessPolicies }) {
  if (allowedBins.length) {
    console.log('\n# allowed packages with bin scripts')
    allowedBins.forEach(({ canonicalName, bin }) => {
      console.log(`- ${canonicalName} [${bin}]`)
    })
  }

  if (excessPolicies.length) {
    console.log(
      '\n# packages with bin scripts that no longer need configuration (package or script removed or script path outdated)'
    )
    excessPolicies.forEach((bin) => {
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
  allowConfig,
}) {
  /**
   * @param {string} pattern
   */
  const markUnused = (pattern) => {
    if (excessPolicies.includes(pattern)) {
      return `${pattern} \t (!) no matching package with lifecycle scripts installed`
    }
    return pattern
  }
  console.log('\n# allowed packages')
  if (allowedPatterns.length) {
    console.log(`- ${allowedPatterns.map(markUnused).join('\n- ')}\n`)
  } else {
    console.log('  (none)')
  }

  console.log('\n# disallowed packages')
  if (disallowedPatterns.length) {
    console.log(`- ${disallowedPatterns.map(markUnused).join('\n- ')}\n`)
  } else {
    console.log('  (none)')
  }

  console.log('\n# unconfigured packages')
  if (missingPolicies.length) {
    console.log(`- ${missingPolicies.join('\n- ')}\n`)
  } else {
    console.log('  (none)')
  }

  console.log(
    `\n# packages on the allowlist that don't match any installed packages with lifecycle scripts`
  )
  if (excessPolicies.length) {
    console.log(`- ${excessPolicies.join('\n- ')}\n`)
  } else {
    console.log('  (none)')
  }

  console.log(
    '\n# all packages with lifecycle scripts found in dependencies (configured and unconfigured)'
  )
  if (packagesWithScripts.size) {
    Array.from(packagesWithScripts.entries()).forEach(([pattern, pkgs]) => {
      console.log(
        `- ${pattern} \n\t${pkgs.map(({ path }) => path).join('\n\t')}`
      )
    })
  } else {
    console.log('  (none)')
  }

  const lifecycleDeepCopy = {
    packagesWithScripts: new Map(packagesWithScripts),
    allowedPatterns: [...allowedPatterns],
    disallowedPatterns: [...disallowedPatterns],
    missingPolicies: [...missingPolicies],
    excessPolicies: [...excessPolicies],
    allowConfig: JSON.parse(JSON.stringify(allowConfig)),
  }

  const { changed, logs } = applyMigrations({
    lifecycle: lifecycleDeepCopy,
    skipVersions: false,
  })
  if (changed || logs.length > 0) {
    console.log(
      '\n# in the current state, allow-scripts auto would apply the following migrations:',
      logs
    )
  }
}

/**
 * @param {ScriptsConfig} param0
 */
function isScriptConfigurationClean(
  {
    packagesWithScripts,
    allowedPatterns,
    disallowedPatterns,
    missingPolicies,
    excessPolicies,
    allowConfig,
  },
  skipVersions = false
) {
  if (missingPolicies.length || excessPolicies.length) {
    return false
  }

  const lifecycleDeepCopy = {
    packagesWithScripts: new Map(packagesWithScripts),
    allowedPatterns: [...allowedPatterns],
    disallowedPatterns: [...disallowedPatterns],
    missingPolicies: [...missingPolicies],
    excessPolicies: [...excessPolicies],
    allowConfig: JSON.parse(JSON.stringify(allowConfig)),
  }

  const { changed, logs } = applyMigrations({
    lifecycle: lifecycleDeepCopy,
    skipVersions,
  })
  if (changed || logs.length > 0) {
    return false
  }

  return true
}

module.exports = {
  printPackagesList,
  printMissingPoliciesIfAny,
  checkPackagesList,
}
