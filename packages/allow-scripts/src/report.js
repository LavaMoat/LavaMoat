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
  console.log('\n# allowed packages')
  if (allowedPatterns.length) {
    console.log('- ' + allowedPatterns.join('\n- '), '\n')
  } else {
    console.log('  (none)')
  }

  console.log('\n# disallowed packages')
  if (disallowedPatterns.length) {
    console.log('- ' + disallowedPatterns.join('\n- '), '\n')
  } else {
    console.log('  (none)')
  }

  console.log('\n# unconfigured packages')
  if (missingPolicies.length) {
    console.log('- ' + missingPolicies.join('\n- '), '\n')
  } else {
    console.log('  (none)')
  }

  console.log(
    `\n# packages on the allowlist that don't match any installed packages with lifecycle scripts`
  )
  if (excessPolicies.length) {
    console.log('- ' + excessPolicies.join('\n- '), '\n')
  } else {
    console.log('  (none)')
  }

  console.log(
    '\n# all packages with lifecycle scripts found in dependencies (configured and unconfigured)'
  )
  if (packagesWithScripts.size) {
    Array.from(packagesWithScripts.entries()).forEach(([pattern, pkgs]) => {
      console.log(`- ${pattern} ${pkgs.map(({ path }) => path).join(' ')}`)
    })
  } else {
    console.log('  (none)')
  }
}

module.exports = {
  printPackagesList,
  printMissingPoliciesIfAny,
}
