/**
 * Configuration read/write functions
 *
 * @module
 */
const { existsSync, promises: fs } = require('node:fs')
const path = require('node:path')
const { FEATURE } = require('./toggles')
const normalizeBin = require('npm-normalize-package-bin')
const { loadCanonicalNameMap } = require('@lavamoat/aa')

const bannedBins = new Set(['corepack', 'node', 'npm', 'pnpm', 'yarn'])

/**
 * Checks if versionToCheck is lower than or equal to versionAllowed
 *
 * @param {string} versionToCheck
 * @param {string} versionAllowed
 * @returns {boolean}
 */
const versionBelowOrEqual = (versionToCheck, versionAllowed) => {
  // if versionToCheck is strictly lower than versionAllowed, then it's allowed
  const [majorAllowed, minorAllowed, patchAllowed] = versionAllowed
    .split('.')
    .map(Number)
  const [majorToCheck, minorToCheck, patchToCheck] = versionToCheck
    .split('.')
    .map(Number)

  if (majorToCheck < majorAllowed) {
    return true
  } else if (majorToCheck === majorAllowed) {
    if (minorToCheck < minorAllowed) {
      return true
    } else if (minorToCheck === minorAllowed) {
      if (patchToCheck < patchAllowed) {
        return true
      }
    }
  }

  return false
}

const ANY_VERSION = '9999'
/**
 * @param {string[]} allowedPatterns
 */
const versionAwareMatcher = (allowedPatterns) => {
  const indexedPatterns = allowedPatterns.reduce((acc, pattern) => {
    const [name, version] = pattern.split('#')
    if (!version) {
      acc[name] = ANY_VERSION
    } else if (!acc[name] || versionBelowOrEqual(version, acc[name])) {
      acc[name] = version
    }
    return acc
  }, /** @type {Record<string, string>} */ ({}))

  return {
    /**
     * Compares two allowlist patterns by version, returns true if the
     * patternToCheck is the same version or lower than the patternAllowed
     *
     * @param {string} patternToCheck
     * @returns {boolean}
     */
    allowedWithVersionAndBelow: (patternToCheck) => {
      if (!patternToCheck.includes('#')) {
        return false
      }
      const [nameToCheck, versionToCheck] = patternToCheck.split('#')
      const versionAllowed = indexedPatterns[nameToCheck]

      if (versionAllowed === undefined) {
        return false
      }

      if (versionAllowed === versionToCheck) {
        return true
      }

      return versionBelowOrEqual(versionToCheck, versionAllowed)
    },
  }
}

/**
 * Scripts with names other than these are ignored and unenforced by default.
 */
const DEFAULT_LIFECYCLE_EVENTS = ['preinstall', 'install', 'postinstall']

/**
 * @param {Object} args
 * @param {string} args.rootDir
 * @param {string[]} [args.lifecycleEvents] - Which script names to consider
 * @param {boolean} [args.skipVersions] - Whether to skip versioning in patterns
 * @returns {Promise<PkgConfs>}
 */
async function loadAllPackageConfigurations({
  rootDir,
  lifecycleEvents = DEFAULT_LIFECYCLE_EVENTS,
  skipVersions = false,
}) {
  const packagesWithScriptsLifecycle = new Map()
  /** @type {BinCandidates} */
  const binCandidates = new Map()

  const canonicalNamesByPath = await loadCanonicalNameMap({
    rootDir,
    includeDevDeps: true,
  })
  const sortedDepEntries = Array.from(canonicalNamesByPath.entries()).sort(
    sortBy(([, canonicalName]) => canonicalName)
  )
  const packageJson = /** @type {LavamoatPackageJson} */ (
    JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
  )
  const directDeps = new Set([
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.dependencies || {}),
  ])

  for (const [filePath, canonicalName] of sortedDepEntries) {
    // const canonicalName = getCanonicalNameForPath({ rootDir, filePath: filePath })
    /** @type {LavamoatPackageJson} */
    let depPackageJson
    // eslint-disable-next-line no-useless-catch
    try {
      depPackageJson = JSON.parse(
        await fs.readFile(path.join(filePath, 'package.json'), 'utf-8')
      )
    } catch (err) {
      // FIXME: leftovers of code that used to work
      // const branchIsOptional = branch.some(node => node.optional)
      // if (err.code === 'ENOENT' && branchIsOptional) {
      //   continue
      // }
      throw err
    }
    const depScripts = depPackageJson.scripts || {}
    const version = depPackageJson.version || 'unknown'
    const lifecycleScripts = lifecycleEvents.filter((name) =>
      Object.prototype.hasOwnProperty.call(depScripts, name)
    )

    /** @type {string} */
    let pattern
    if (skipVersions) {
      pattern = canonicalName
    } else {
      pattern = `${canonicalName}#${version}`
    }

    if (
      !lifecycleScripts.includes('preinstall') &&
      !lifecycleScripts.includes('install') &&
      existsSync(path.join(filePath, 'binding.gyp'))
    ) {
      lifecycleScripts.unshift('install')
      depScripts.install = 'node-gyp rebuild'
    }

    if (lifecycleScripts.length) {
      /**
       * @type {{
       *   pattern: string
       *   path: string
       *   scripts: LavamoatPackageJson['scripts']
       *   version: string
       * }[]}
       */
      const collection = packagesWithScriptsLifecycle.get(pattern) || []
      collection.push({
        pattern,
        path: filePath,
        scripts: depScripts,
        version,
      })
      packagesWithScriptsLifecycle.set(pattern, collection)
    }

    if (FEATURE.bins && depPackageJson.bin) {
      const binsList = /** @type {[string, string][]} */ (
        Object.entries(normalizeBin(depPackageJson)?.bin || {})
      )

      binsList.forEach(([name, link]) => {
        /** @type {BinInfo[]} */
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
          fullLinkPath: path.relative(rootDir, path.join(filePath, link)),
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

  const somePoliciesAreMissing = !!(
    configs.lifecycle.missingPolicies.length ||
    configs.bin.somePoliciesAreMissing
  )

  return {
    packageJson,
    configs,
    somePoliciesAreMissing,
    canonicalNamesByPath,
  }
}

/**
 * @param {GetOptionsForBinParams} params
 * @returns {Promise<BinInfo[] | undefined>}
 */
async function getOptionsForBin({
  rootDir,
  name,
  lifecycleEvents = DEFAULT_LIFECYCLE_EVENTS,
}) {
  const {
    configs: {
      bin: { binCandidates },
    },
  } = await loadAllPackageConfigurations({ rootDir, lifecycleEvents })

  return binCandidates.get(name)
}

/**
 * @param {SetDefaultConfigurationParams} params
 */
async function setDefaultConfiguration({
  rootDir,
  lifecycleEvents = DEFAULT_LIFECYCLE_EVENTS,
  skipVersions = false,
}) {
  const conf = await loadAllPackageConfigurations({
    rootDir,
    lifecycleEvents,
    skipVersions,
  })
  const {
    configs: { lifecycle, bin },
    somePoliciesAreMissing,
  } = conf

  console.log('\n@lavamoat/allow-scripts automatically updating configuration')

  if (!somePoliciesAreMissing) {
    console.log('\nconfiguration looks good as is, no changes necessary')
    return
  }

  console.log('\nadding configuration:')

  lifecycle.missingPolicies.forEach((pattern) => {
    console.log(`- lifecycle ${pattern}`)
    lifecycle.allowConfig[pattern] = false
  })

  if (FEATURE.bins && bin.somePoliciesAreMissing) {
    bin.allowConfig = prepareBinScriptsPolicy(bin.binCandidates)
    console.log(
      `- bin scripts linked: ${Object.keys(bin.allowConfig).join(',')}`
    )
  }

  // update package json
  await savePackageConfigurations({
    rootDir,
    conf,
  })
}

// internals

/**
 * @param {BinCandidates} binCandidates
 */
function prepareBinScriptsPolicy(binCandidates) {
  /** @type {Record<string, string>} */
  const policy = {}
  // pick direct dependencies without conflicts and enable them by default unless colliding with bannedBins
  for (const [bin, infos] of binCandidates.entries()) {
    const binsFromDirectDependencies = infos.filter((i) => i.isDirect)
    if (binsFromDirectDependencies.length === 1 && !bannedBins.has(bin)) {
      // there's no conflicts, seems fairly obvious choice to put it up
      policy[bin] = binsFromDirectDependencies[0].fullLinkPath
    }
  }
  return policy
}

/**
 * @param {SavePackageConfigurationsParams} params
 * @returns {Promise<void>}
 */
async function savePackageConfigurations({
  rootDir,
  conf: {
    packageJson,
    configs: { lifecycle, bin },
  },
}) {
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
 * Adds helpful redundancy to the config object thus producing a full
 * ScriptsConfig type
 *
 * @param {import('type-fest').SetRequired<
 *   Partial<ScriptsConfig>,
 *   'packagesWithScripts'
 * >} config
 * @returns {ScriptsConfig}
 */
function indexLifecycleConfiguration(config) {
  config.allowConfig = config.allowConfig || {}
  // packages with config
  const configuredPatterns = Object.keys(config.allowConfig)

  const { allowedWithVersionAndBelow } = versionAwareMatcher(configuredPatterns)
  // select allowed + disallowed
  config.allowedPatterns = Object.entries(config.allowConfig)
    .filter(([, packageData]) => !!packageData)
    .map(([pattern]) => pattern)

  config.disallowedPatterns = Object.entries(config.allowConfig)
    .filter(([, packageData]) => !packageData)
    .map(([pattern]) => pattern)

  config.missingPolicies = Array.from(
    config.packagesWithScripts.keys() ?? []
  ).filter((pattern) => !allowedWithVersionAndBelow(pattern))

  config.excessPolicies = configuredPatterns.filter(
    (pattern) => !config.packagesWithScripts.has(pattern)
  )

  return /** @type {ScriptsConfig} */ (config)
}

/**
 * Adds helpful redundancy to the config object thus producing a full
 * {@link BinsConfig} type
 *
 * @param {import('type-fest').SetRequired<
 *   Partial<BinsConfig>,
 *   'binCandidates'
 * >} config
 * @returns {BinsConfig}
 */
function indexBinsConfiguration(config) {
  // only autogenerate the initial config. A better heuristic would be to detect if any scripts from direct dependencies are missing
  config.somePoliciesAreMissing =
    !config.allowConfig && config.binCandidates.size > 0
  config.excessPolicies = Object.keys(config.allowConfig || {}).filter(
    (b) => !config.binCandidates.has(b)
  )
  config.allowedBins = /** @type {BinInfo[]} */ (
    Object.entries(config.allowConfig || {})
      .map(([bin, fullPath]) =>
        config.binCandidates
          .get(bin)
          ?.find(
            (/** @type BinInfo */ candidate) =>
              candidate.fullLinkPath === fullPath
          )
      )
      .filter((a) => a)
  )

  config.firewalledBins = Array.from(config.binCandidates.values())
    .flat()
    .filter((binInfo) => !config.allowedBins?.includes(binInfo))
  return /** @type {BinsConfig} */ (config)
}

/**
 * @template T
 * @template U
 * @param {(value: T) => U} getterFn
 * @returns {(a: T, b: T) => 1 | -1 | 0}
 */
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

module.exports = {
  getOptionsForBin,
  loadAllPackageConfigurations,
  setDefaultConfiguration,
  versionAwareMatcher,
}
