const {
  appendFileSync,
  existsSync,
  promises: fs,
  readFileSync,
  writeFileSync,
} = require('node:fs')
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const normalizeBin = require('npm-normalize-package-bin')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const { FEATURE } = require('./toggles')

const NPM = {
  RCFILE: '.npmrc',
  CONF: {
    SCRIPTS: 'ignore-scripts=true',
    BINS: 'bin-links=false',
  },
}
const YARN1 = {
  RCFILE: '.yarnrc',
  CONF: {
    SCRIPTS: 'ignore-scripts true',
    BINS: '--*.no-bin-links true',
  },
}
const YARN3 = {
  RCFILE: '.yarnrc.yml',
  CONF: {
    SCRIPTS: 'enableScripts: false',
  },
}

/**
 * @type {boolean}
 */
let binsBlockedMemo

const bannedBins = new Set(['corepack', 'node', 'npm', 'pnpm', 'yarn'])

module.exports = {
  areBinsBlocked,
  editPackageJson,
  getOptionsForBin,
  loadAllPackageConfigurations,
  setDefaultConfiguration,
  writeRcFile,
}

/**
 * @typedef AreBinsBlockedOpts
 * @property {boolean} [noMemoization] Turn off memoization, make a fresh lookup
 */

/**
 * @param {AreBinsBlockedOpts} args
 * @returns {boolean}
 */
function areBinsBlocked({ noMemoization = false } = {}) {
  if (noMemoization || binsBlockedMemo === undefined) {
    binsBlockedMemo =
      isEntryPresent(NPM.CONF.BINS, NPM.RCFILE) ||
      isEntryPresent(YARN1.CONF.BINS, YARN1.RCFILE)
    // Once yarn3 support via plugin comes in, this function would need to detect that, or cease to exist.
  }
  return binsBlockedMemo
}

function writeRcFile() {
  const yarnRcExists = existsSync(addInstallParentDir(YARN1.RCFILE))
  const yarnYmlExists = existsSync(addInstallParentDir(YARN3.RCFILE))
  const npmRcExists = existsSync(addInstallParentDir(NPM.RCFILE))
  const yarnLockExists = existsSync(addInstallParentDir('yarn.lock'))

  const configs = []
  if (yarnRcExists || yarnLockExists) {
    configs.push({
      file: YARN1.RCFILE,
      exists: yarnRcExists,
      entry: YARN1.CONF.SCRIPTS,
    })
    if (FEATURE.bins) {
      configs.push({
        file: YARN1.RCFILE,
        exists: yarnRcExists,
        entry: YARN1.CONF.BINS,
      })
    }
  }
  if (yarnYmlExists || yarnLockExists) {
    configs.push({
      file: YARN3.RCFILE,
      exists: yarnYmlExists,
      entry: YARN3.CONF.SCRIPTS,
    })
  }
  if (configs.length === 0) {
    // default to npm, because that's what everyone has anyway
    configs.push({
      file: NPM.RCFILE,
      exists: npmRcExists,
      entry: NPM.CONF.SCRIPTS,
    })
    if (FEATURE.bins) {
      configs.push({
        file: NPM.RCFILE,
        exists: npmRcExists,
        entry: NPM.CONF.BINS,
      })
    }
  }

  configs.forEach(writeRcFileContent)
}

function editPackageJson() {
  let cmd, cmdArgs

  if (existsSync('./.npmrc')) {
    cmd = 'npm'
    cmdArgs = ['install', '-d', '@lavamoat/preinstall-always-fail']
  } else {
    cmd = 'yarn'
    cmdArgs = ['add', '-D', '@lavamoat/preinstall-always-fail']
  }

  let result = spawnSync(cmd, cmdArgs, {})

  if (result.status !== 0) {
    process.stderr.write(result.stderr)
    console.log(
      '@lavamoat/allow-scripts: Could not add @lavamoat/preinstall-always-fail.'
    )
  } else {
    console.log(
      '@lavamoat/allow-scripts: Added dependency @lavamoat/preinstall-always-fail.'
    )
  }

  if (FEATURE.bins) {
    // no motivation to fix lint here, there's a better implementation of this in a neighboring branch
    const packageJson = /** @type {import('type-fest').PackageJson} */ (
      require(addInstallParentDir('package.json'))
    )
    if (!packageJson.scripts) {
      packageJson.scripts = {}
    }
    // If you think `node ` is redundant below, be aware that `./cli.js` won't work on Windows,
    // but passing a unix-style path to node on Windows works fine.
    packageJson.scripts['allow-scripts'] =
      'node ./node_modules/@lavamoat/allow-scripts/src/cli.js --experimental-bins'
    console.log(
      '@lavamoat/allow-scripts: Adding allow-scripts as a package.json script with direct path.'
    )
    writeFileSync(
      addInstallParentDir('package.json'),
      JSON.stringify(packageJson, null, 2)
    )
  }
}

/**
 * @typedef GetOptionsForBinOpts
 * @property {string} rootDir
 * @property {string} name
 */

/**
 * @param {GetOptionsForBinOpts} param0
 */
async function getOptionsForBin({ rootDir, name }) {
  const {
    configs: {
      bin: { binCandidates },
    },
  } = await loadAllPackageConfigurations({ rootDir })

  return binCandidates.get(name)
}

/**
 * @typedef PkgLavamoatConfig
 * @property {Record<string, any>} [allowScripts]
 * @property {Record<string, any>} [allowBins]
 * @property {Record<string, any>} [allowConfig]
 * @property {Record<string, any>} [allowedPatterns]
 * @property {Record<string, any>} [disallowedPatterns]
 * @property {Record<string, any>} [missingPolicies]
 * @property {Record<string, any>} [excessPolicies]
 */

/**
 * @typedef {import('type-fest').PackageJson & { lavamoat: PkgLavamoatConfig }} LavamoatPackageJson
 */

/**
 * @typedef {Object} PkgConfs
 * @property {LavamoatPackageJson} packageJson
 * @property {Object} configs
 * @property {ScriptsConfig} configs.lifecycle
 * @property {BinsConfig} configs.bin
 * @property {boolean} somePoliciesAreMissing
 * @property {Map<string,string>} canonicalNamesByPath
 */

/**
 * @param {Object} args
 * @param {string} args.rootDir
 * @returns {Promise<PkgConfs>}
 */
async function loadAllPackageConfigurations({ rootDir }) {
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
    const lifeCycleScripts = ['preinstall', 'install', 'postinstall'].filter(
      (name) => Object.prototype.hasOwnProperty.call(depScripts, name)
    )

    if (
      !lifeCycleScripts.includes('preinstall') &&
      !lifeCycleScripts.includes('install') &&
      existsSync(path.join(filePath, 'binding.gyp'))
    ) {
      lifeCycleScripts.unshift('install')
      depScripts.install = 'node-gyp rebuild'
    }

    if (lifeCycleScripts.length) {
      /**
       * @type {{
       *   canonicalName: string
       *   path: string
       *   scripts: LavamoatPackageJson['scripts']
       * }[]}
       */
      const collection = packagesWithScriptsLifecycle.get(canonicalName) || []
      collection.push({
        canonicalName,
        path: filePath,
        scripts: depScripts,
      })
      packagesWithScriptsLifecycle.set(canonicalName, collection)
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
 * @typedef SetDefaultConfigurationOpts
 * @property {string} rootDir
 */

/**
 * @param {SetDefaultConfigurationOpts} param0
 */
async function setDefaultConfiguration({ rootDir }) {
  const conf = await loadAllPackageConfigurations({ rootDir })
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
 * @param {string} filename
 * @returns {string}
 */
function addInstallParentDir(filename) {
  const rootDir = process.env.INIT_CWD || process.cwd()
  return path.join(rootDir, filename)
}

/**
 * @param {string} entry
 * @param {string} file
 * @returns {boolean}
 */
function isEntryPresent(entry, file) {
  const rcPath = addInstallParentDir(file)
  if (!existsSync(rcPath)) {
    return false
  }
  const rcFileContents = readFileSync(rcPath, 'utf8')
  return rcFileContents.includes(entry)
}

/**
 * @typedef WriteRcFileContentOpts
 * @property {string} file
 * @property {string} entry
 */

/**
 * @param {WriteRcFileContentOpts} param0
 */
function writeRcFileContent({ file, entry }) {
  const rcPath = addInstallParentDir(file)

  if (isEntryPresent(entry, file)) {
    console.log(
      `@lavamoat/allow-scripts: file ${rcPath} already exists with entry: ${entry}.`
    )
  } else {
    appendFileSync(rcPath, entry + '\n')
    console.log(`@lavamoat/allow-scripts: added entry to ${rcPath}: ${entry}.`)
  }
}

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
 * @typedef SavePackageConfigurationsOpts
 * @property {string} rootDir
 * @property {PkgConfs} conf
 */

/**
 * @param {SavePackageConfigurationsOpts} param0
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
  // select allowed + disallowed
  config.allowedPatterns = Object.entries(config.allowConfig)
    .filter(([, packageData]) => !!packageData)
    .map(([pattern]) => pattern)

  config.disallowedPatterns = Object.entries(config.allowConfig)
    .filter(([, packageData]) => !packageData)
    .map(([pattern]) => pattern)

  config.missingPolicies = Array.from(
    config.packagesWithScripts.keys() ?? []
  ).filter((pattern) => !configuredPatterns.includes(pattern))

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
