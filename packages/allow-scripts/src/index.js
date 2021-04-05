const { promises: fs } = require('fs')
const path = require('path')
const { promisify } = require('util')
const resolve = promisify(require('resolve'))
const semver = require('semver')
const logicalTree = require('npm-logical-tree')
const yarnLockfileParser = require('@yarnpkg/lockfile')
const npmRunScript = require('@npmcli/run-script')
const yarnLogicalTree = require('./yarnLogicalTree')

module.exports = {
  // primary
  runAllowedPackages,
  setDefaultConfiguration,
  printPackagesList,
  // util
  loadTree,
  findAllFilePathsForTree,
  getAllowedScriptsConfig,
  parseYarnLockForPackages,
  getCanonicalNameInfo
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
  const packageJsonSerialized = JSON.stringify(packageJson, null, 2)
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

function getAllowedScriptsConfig (packageJson) {
  const lavamoatConfig = packageJson.lavamoat || {}
  return lavamoatConfig.allowScripts || {}
}

async function parseYarnLockForPackages () {
  const yarnLockfileContent = await fs.readFile('./yarn.lock', 'utf8')
  const { object: parsedLockFile } = yarnLockfileParser.parse(yarnLockfileContent)
  // parsedLockFile contains an entry from each range to resolved package, so we dedupe
  const uniquePackages = new Set(Object.values(parsedLockFile))
  return Array.from(uniquePackages.values(), ({ resolved, version }) => {
    const { namespace, canonicalName } = getCanonicalNameInfo(resolved)
    return { resolved, version, namespace, canonicalName }
  })
}

function getCanonicalNameInfo (resolvedUrl) {
  const url = new URL(resolvedUrl)
  switch (url.host) {
    case 'registry.npmjs.org': {
      // eg: registry.npmjs.org:/@types/json5/-/json5-0.0.29.tgz
      const pathParts = url.pathname.split('/').slice(1)
      // support for namespaced packages
      const packageName = pathParts.slice(0, pathParts.indexOf('-')).join('/')
      return {
        namespace: 'npm',
        canonicalName: `${packageName}`
      }
    }
    case 'registry.yarnpkg.com': {
      const pathParts = url.pathname.split('/').slice(1)
      // support for namespaced packages
      const packageName = pathParts.slice(0, pathParts.indexOf('-')).join('/')
      return {
        namespace: 'npm',
        canonicalName: `${packageName}`
      }
    }
    case 'github.com': {
      // note: protocol may be "git+https" "git+ssh" or something else
      // eg: 'git+ssh://git@github.com/ethereumjs/ethereumjs-abi.git#1ce6a1d64235fabe2aaf827fd606def55693508f'
      const [, ownerName, repoRaw] = url.pathname.split('/')
      // remove final ".git"
      const repoName = repoRaw.split('.git').slice(0, -1).join('.git')
      return {
        namespace: 'github',
        canonicalName: `github:${ownerName}/${repoName}`
      }
    }
    case 'codeload.github.com': {
      // eg: https://codeload.github.com/LavaMoat/bad-idea-collection-non-canonical-keccak/tar.gz/d4718c405bd033928ebfedaca69f96c5d90ef4b0
      const [, ownerName, repoName] = url.pathname.split('/')
      return {
        namespace: 'github',
        canonicalName: `github:${ownerName}/${repoName}`
      }
    }
    case '': {
      // "github" as protocol
      // 'eg: github:ipfs/webrtcsupport#0a7099ff04fd36227a32e16966dbb3cca7002378'
      if (url.protocol !== 'github:') {
        throw new Error(`failed to parse canonical name for url: "${url}"`)
      }
      const [ownerName, repoName] = url.pathname.split('/')
      return {
        namespace: 'github',
        canonicalName: `github:${ownerName}/${repoName}`
      }
    }
    default: {
      return {
        namespace: 'url',
        canonicalName: `${url.host}:${url.pathname}`
      }
    }
  }
}

async function loadTree ({ rootDir }) {
  const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'))
  // attempt to load lock files
  let yarnLockfileContent
  let packageLockfileContent
  try {
    yarnLockfileContent = await fs.readFile(path.join(rootDir, 'yarn.lock'), 'utf8')
  } catch (err) { /* ignore error */ }
  try {
    packageLockfileContent = await fs.readFile(path.join(rootDir, 'package-lock.json'), 'utf8')
  } catch (err) { /* ignore error */ }
  if (yarnLockfileContent && packageLockfileContent) {
    console.warn('@lavamoat/allow-scripts - both yarn and npm lock files detected -- using yarn')
    packageLockfileContent = undefined
  }
  let tree
  if (yarnLockfileContent) {
    const { object: parsedLockFile } = yarnLockfileParser.parse(yarnLockfileContent)
    tree = yarnLogicalTree.loadTree(packageJson, parsedLockFile)
    // fix path (via address field) for yarn tree
    // TOOO: make parallel
    for await (const { node, filePath } of findAllFilePathsForTree(tree)) {
      // skip unresolved paths
      // TODO: document when/why this would be falsy
      if (!filePath) continue
      const relativePath = path.relative(rootDir, filePath)
      const address = relativePath.slice('node_modules/'.length).split('/node_modules/').join(':')
      node.address = address
    }
  } else if (packageLockfileContent) {
    const packageLock = JSON.parse(packageLockfileContent)
    tree = logicalTree(packageJson, packageLock)
  } else {
    throw new Error('@lavamoat/allow-scripts - unable to find lock file (yarn or npm)')
  }
  // TODO: validate tree (ensure nodes have addresses)

  return { tree, packageJson }
}

async function * findAllFilePathsForTree (tree) {
  const filePathCache = new Map()
  for (const { node, branch } of eachNodeInTree(tree)) {
    // my intention with yielding with a then is that it will be able to produce the
    // next iteration without waiting for the promise to resolve
    yield findFilePathForTreeNode(branch, filePathCache).then(filePath => {
      return { node, filePath }
    })
  }
}

async function findFilePathForTreeNode (branch, filePathCache) {
  const currentNode = branch[branch.length - 1]
  let resolvedPath
  if (branch.length === 1) {
    // root package
    resolvedPath = process.cwd()
  } else {
    // dependency
    const parentNode = branch[branch.length - 2]
    const relativePath = filePathCache.get(parentNode)
    try {
      const packagePath = await resolve(`${currentNode.name}/package.json`, { basedir: relativePath })
      resolvedPath = path.dirname(packagePath)
    } catch (err) {
      // error if not a resolution error
      if (err.code !== 'MODULE_NOT_FOUND') {
        throw err
      }
      // error if non-optional
      const branchIsOptional = branch.some(node => node.optional)
      if (!branchIsOptional) {
        throw new Error(`@lavamoat/allow-scripts - could not resolve non-optional package "${currentNode.name}" from "${relativePath}"`)
      }
      // otherwise ignore error
    }
  }
  filePathCache.set(currentNode, resolvedPath)
  return resolvedPath
}

function * eachNodeInTree (node, visited = new Set(), branch = []) {
  // visit each node only once
  if (visited.has(node)) return
  visited.add(node)
  // add self to branch
  branch.push(node)
  // visit
  yield { node, branch }
  // recurse
  for (const [, child] of node.dependencies) {
    yield * eachNodeInTree(child, visited, [...branch])
  }
}

function getCanonicalNameInfoForTreeNode (node) {
  // node.resolved is only defined once in the tree for npm (?)
  if (node.resolved) {
    return getCanonicalNameInfo(node.resolved)
  }
  const validSemver = semver.validRange(node.version)
  if (validSemver) {
    return {
      namespace: 'npm',
      canonicalName: node.name
    }
  } else {
    return getCanonicalNameInfo(node.version)
  }
}

async function loadAllPackageConfigurations ({ rootDir }) {
  const { tree, packageJson } = await loadTree({ rootDir })

  const packagesWithLifecycleScripts = new Map()
  for (const { node, branch } of eachNodeInTree(tree)) {
    // Skip root package
    if (branch.length === 1) continue

    const { canonicalName } = getCanonicalNameInfoForTreeNode(node)
    const nodePath = node.path()

    // TODO: follow symbolic links? I couldnt find any in my test repo,
    let depPackageJson
    try {
      depPackageJson = JSON.parse(await fs.readFile(path.resolve(nodePath, 'package.json')))
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
        path: nodePath,
        scripts: depScripts
      })
      packagesWithLifecycleScripts.set(canonicalName, collection)
    }
  }

  const allowScriptsConfig = getAllowedScriptsConfig(packageJson)

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
    tree,
    packageJson,
    allowScriptsConfig,
    packagesWithLifecycleScripts,
    allowedPatterns,
    disallowedPatterns,
    missingPolicies,
    excessPolicies
  }
}
