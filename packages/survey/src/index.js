const { promises: fs } = require('fs')
const path = require('path')
const pLimit = require('p-limit')
const { makeResolveHook } = require('lavamoat/src/parseForPolicy')
const { loadPackage } = require('./load.js')
const { getTopPackages } = require('./getTopPackages.js')
const { parseForPolicy } = require('./parseForPolicy.js')
const { fileExists } = require('./util.js')

const concurrencyLimit = pLimit(8)


const parseBlacklist = [
  // typescript
  'react-native',
  'ast-types-flow',
  // jsx
  'expo',
  // ses non-compliant (Legacy octal literals in strict mode)
  // @babel/plugin-transform-literals
  // 'vows',
  // 'keypress',
  // 'xunit-file',
  // 'spec-xunit-file',
  // 'blessed',
  // 'commoner',
  // 'istanbul-harmony',
  // reserved word "package"
  // @babel/plugin-transform-reserved-words
  'main-bower-files',
  'pm2',
  // TODO class properties ( node v12 supports )
  // @babel/plugin-proposal-class-properties
  '@hapi/hapi',
  // no main/index
  'husky',
]

start().catch(err => {
  console.error(err)
  process.exit(1)
})

async function start () {
  const packages = await getTopPackages()
  // const packages = ['relay-compiler']
  const allConfigs = { resources: {} }
  await Promise.all(packages.map(async (packageName) => {
    if (parseBlacklist.includes(packageName)) {
      return
    }
    const config = await concurrencyLimit(() => loadPolicy(packageName))
    if (!config || !config.resources) {
      console.warn(`config for "${packageName}" is broken`)
      return
    }
    // skip if empty
    if (!config.resources[packageName]) {
      return
    }
    allConfigs.resources[packageName] = config.resources[packageName]
  }))
  await writeConfig('_all', allConfigs)
  console.log('done!')
}

async function loadPolicy (packageName) {
  const policyPath = getPolicyPath(packageName)
  if (await fileExists(policyPath)) {
    return require(policyPath)
  }
  return await generateConfigFile(packageName)
}

async function generateConfigFile (packageName) {
  const config = await generatePolicy(packageName)
  await writeConfig(packageName, config)
  console.log(`completed "${packageName}"`)
  return config
}

async function generatePolicy (packageName) {
  const { package, packageDir } = await loadPackage(packageName)
  // if main is explicitly empty, skip (@types/node, etc)
  if (package.main === '') {
    console.warn(`skipped "${packageName}" - explicitly no entry`)
    return { resources: {} }
  }
  // normalize the id as a relative path
  const entryId = './' + path.relative('./', package.main || 'index.js')
  const resolveHook = makeResolveHook({ cwd: packageDir })
  let entryFull
  try {
    entryFull = resolveHook(entryId, `${packageDir}/package.json`)
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn(`skipped "${packageName}" - no entry`)
      return  { resources: {} }
    }
    throw err
  }
  console.log(`generating config for "${packageName}"`)
  let config
  try {
    config = await parseForPolicy({
      rootPackageName: packageName,
      packageDir,
      entryId,
      resolutions: {},
    })
    return config
  } catch (err) {
    throw new Error(`Failed to parse package "${packageName}": ${err.stack}`)
  }
}

async function writeConfig (packageName, config) {
  const configContent = JSON.stringify(config, null, 2)
  const policyPath = getPolicyPath(packageName)
  const policyDir = path.dirname(policyPath)
  // ensure dir exists (this includes the package scope)
  await fs.mkdir(path.dirname(policyPath), { recursive: true })
  await fs.writeFile(policyPath, configContent)
}

function getPolicyPath (packageName) {
  const policyDir = path.resolve(__dirname, '../results/')
  const policyPath = `${policyDir}/${packageName}.json`
  return policyPath
}
