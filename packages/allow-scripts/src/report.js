/**
 * Reporting functions
 *
 * @module
 */
const { loadAllPackageConfigurations } = require('./config.js')

/**
 * @param {PrintPackagesListParams} params
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
  console.log('\n# allowed packages with bin scripts')
  if (allowedBins.length) {
    allowedBins.forEach(({ canonicalName, bin }) => {
      console.log(`- ${canonicalName} [${bin}]`)
    })
  } else {
    console.log('  (none)')
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
}) {
  console.log('\n# allowed packages with lifecycle scripts')
  if (allowedPatterns.length) {
    allowedPatterns.forEach((pattern) => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  console.log('\n# disallowed packages with lifecycle scripts')
  if (disallowedPatterns.length) {
    disallowedPatterns.forEach((pattern) => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  } else {
    console.log('  (none)')
  }

  if (missingPolicies.length) {
    console.log('\n# unconfigured packages with lifecycle scripts')
    missingPolicies.forEach((pattern) => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }

  if (excessPolicies.length) {
    console.log(
      '\n# packages with lifecycle scripts that no longer need configuration due to package or scripts removal'
    )
    excessPolicies.forEach((pattern) => {
      const collection = packagesWithScripts.get(pattern) || []
      console.log(`- ${pattern} [${collection.length} location(s)]`)
    })
  }
}

module.exports = {
  printPackagesList,
  printMissingPoliciesIfAny,
}
