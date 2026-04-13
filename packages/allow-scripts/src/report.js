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
}

module.exports = {
  printPackagesList,
  printMissingPoliciesIfAny,
}
