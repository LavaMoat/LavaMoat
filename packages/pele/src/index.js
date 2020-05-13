const fs = require('fs')
const path = require('path')
const mergeDeep = require('merge-deep')
const { lockdown } = require('ses')
const Module = module.constructor

module.exports.lockdown = () => {
  // apply SES protections
  lockdown()
  // ses lockdown adds these globals
  // we manually pull them off global to make it clear where they come from
  const { harden, Compartment } = global

  // build the lavamoat/pele kernel
  const lavamoatConfig = loadConfig({ debugMode: false })
  const { getEndowmentsForConfig } = require('lavamoat-core/src/makeGetEndowmentsForConfig')()

  const wrapModule = (unsafeModuleInitializer) => {
    const wrappedModuleInitializer = function (exports, require, module, __filename, __dirname) {
      // prepare compartment and endowments
      const packageName = packageNameFromPath(__filename)
      const isRoot = packageName === '<root>'
      let endowments
      if (isRoot) {
        endowments = global
      } else {
        const configForModule = getConfigForPackage(lavamoatConfig, packageName)
        endowments = getEndowmentsForConfig(global, configForModule)
      }
      const compartment = new Compartment(endowments)
      // initialize module
      const moduleInitializer = compartment.evaluate(`(${unsafeModuleInitializer})`)
      const moduleExports = moduleInitializer.call(this, exports, require, module, __filename, __dirname)
      // apply module exports defense
      harden(moduleExports)
    }
    return wrappedModuleInitializer
  }
  global.lavamoat = { wrapModule }

  // modify further module instantiations, such that they always call to lavamoat.wrapModule
  Module.wrapper = [
    'lavamoat.wrapModule(function (exports, require, module, __filename, __dirname) { ',
    '\n});'
  ]
}

function loadConfig ({ debugMode }) {
  const defaultConfigPath = './lavamoat-config.json'
  const defaultConfigOverridePath = './lavamoat-config-override.json'
  const configPath = path.resolve(defaultConfigPath)
  const configOverridePath = path.resolve(defaultConfigOverridePath)
  const lavamoatConfig = _loadConfig({ debugMode, configPath, configOverridePath })
  return lavamoatConfig
}

// from lavamoat-node
function _loadConfig ({ debugMode, configPath, configOverridePath }) {
  let config = { resources: {} }
  // try config
  if (fs.existsSync(configPath)) {
    if (debugMode) console.warn(`Lavamoat looking for config at ${configPath}`)
    const configSource = fs.readFileSync(configPath, 'utf8')
    config = JSON.parse(configSource)
  } else {
    if (debugMode) console.warn('Lavamoat could not find config')
  }
  // try config override
  if (fs.existsSync(configOverridePath)) {
    if (debugMode) console.warn(`Lavamoat looking for override config at ${configOverridePath}`)
    const configSource = fs.readFileSync(configOverridePath, 'utf8')
    const overrideConfig = JSON.parse(configSource)
    config = mergeDeep(config, overrideConfig)
  } else {
    if (debugMode) console.warn('Lavamoat could not find config override')
  }
  return config
}

// from lavamoat-cpre
// this gets the lavaMoat config for a module by packageName
// if there were global defaults (e.g. everything gets "console") they could be applied here
function getConfigForPackage (config, packageName) {
  const packageConfig = (config.resources || {})[packageName] || {}
  packageConfig.globals = packageConfig.globals || {}
  packageConfig.packages = packageConfig.packages || {}
  return packageConfig
}

// from lavamoat-core
function packageNameFromPath (file) {
  const segments = file.split(path.sep)
  const index = segments.lastIndexOf('node_modules')
  if (index === -1) return '<root>'
  let moduleName = segments[index + 1]
  // check for scoped modules
  if (moduleName[0] === '@') {
    moduleName = segments[index + 1] + path.sep + segments[index + 2]
  }
  return moduleName
}
