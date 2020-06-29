const { promises: fs } = require('fs')
const path = require('path')
const pLimit = require('p-limit')
const { loadPackage } = require('./load.js')
const { getTopPackages } = require('./getTopPackages.js')
const { parseForConfig } = require('./parseForConfig.js')
const { fileExists } = require('./util.js')

const concurrencyLimit = pLimit(8)


const parseBlacklist = [
  // typescript
  'react-native',
  'ast-types-flow',
  // jsx
  'expo',
  // ses non-compliant (Legacy octal literals in strict mode)
  'vows',
  'keypress',
  'xunit-file',
  'spec-xunit-file',
  'blessed',
  'commoner',
  'istanbul-harmony',
  // reserved word "package"
  'main-bower-files',
  'pm2',
  // TODO class properties ( node v12 supports )
  '@hapi/hapi',
]

start()

async function start () {
  const packages = await getTopPackages()
  // const packages = ['happypack']
  const allConfigs = { resources: {} }
  await Promise.all(packages.map(async (packageName) => {
    if (parseBlacklist.includes(packageName)) return
    const config = await concurrencyLimit(() => loadConfig(packageName))
    allConfigs.resources[packageName] = config.resources[packageName]
  }))
  await writeConfig('_all', allConfigs)
  console.log('done!')
}

async function loadConfig (packageName) {
  const policyPath = getPolicyPath(packageName)
  if (await fileExists(policyPath)) {
    return require(policyPath)
  }
  console.log(`generating config for "${packageName}"`)
  return await generateConfig(packageName)
}

async function generateConfig (packageName) {
  const { package, packageDir } = await loadPackage(packageName)
  // normalize the id as a relative path
  const entryId = './' + path.relative('./', package.main || 'index.js')
  const config = await parseForConfig({
    packageName,
    cwd: packageDir,
    entryId,
    resolutions: {},
  })
  await writeConfig(packageName, config)
  console.log(`completed ${packageName}`)
  return config
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
  const policyDir = path.resolve(__dirname, `../results/`)
  const policyPath = `${policyDir}/${packageName}.json`
  return policyPath
}