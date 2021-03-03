const {
  ConcatSource,
  RawSource
} = require('webpack-sources')
const { generatePrelude, packageDataForModule, createModuleInspector } = require('lavamoat-core')
const path = require('path')
const mkdirp = require('mkdirp')
const fs = require('fs')
const mergeDeep = require('merge-deep')

class LavaMoat {

  constructor(pluginOpts) {
    this.configuration = this.getConfigurationFromPluginOpts(pluginOpts)
  }

  apply(compiler) {
    if (!compiler.options.optimization || compiler.options.optimization.concatenateModules !== false) {
      throw new Error('LavaMoat - Webpack config: optimization.concatenateModules must be set to false')
    }
    compiler.hooks.compilation.tap(
      this.constructor.name,
      (compilation) => this.handleEmit(compilation).catch(
        (error) => compilation.errors.push(error))
    );
  }

  async handleEmit(compilation) {

    const { mainTemplate } = compilation


    const performRender = (bootstrapSource, chunk, hash, moduleTemplate, dependencyTemplates) => {
      const result = new ConcatSource()
      result.add(generatePrelude())
      const modules = mainTemplate.hooks.modules.call(
        new RawSource(""),
        chunk,
        hash,
        moduleTemplate,
        dependencyTemplates
      )

      // webpack moduleId -> moduleData
      const modulesMetadata = {}
      const inspector = createModuleInspector()
      for (const moduleData of chunk._modules) {

        // NormalModule and RawModule expose properties differently
        let file, packageName, packageVersion, source
        if (moduleData.constructor.name === 'RawModule') {
          packageName = moduleData.readableIdentifierStr.split(' ')[0]
          source = moduleData.sourceStr
        } else if (moduleData.constructor.name === 'NormalModule') {
          file = moduleData.userRequest
          const packageData = packageDataForModule({ file })
          packageName = packageData.packageName || '<root>'
          packageVersion = packageData.version
          if (moduleData.parser.constructor.name === 'JsonParser') {
            source = moduleData._cachedSources.get('javascript').source._source.children[0]
          } else {
            source = moduleData._source._value
          }
        }

        const moduleDataForConfig = {
          id: moduleData.id,
          source,
          package: packageName,
          deps: {}
        }

        for (let dep of moduleData.dependencies) {
          if (!dep.module) {
            continue
          }
          moduleDataForConfig.deps[dep.module.id] = dep.module.id
        }

        inspector.inspectModule(moduleDataForConfig)

        // json serializeable module metadata
        modulesMetadata[moduleData.id] = {
          id: moduleData.id,
          package: packageName,
          packageName,
          packageVersion,
          file,
        }
      }

      const config = inspector.generateConfig()
      if (this.configuration.writeAutoConfig) {
        this.configuration.writeAutoConfig(config)
      }

      // module shape adapter with inject module metadata
      result.add('(')

      const adapterSrc = `(${moduleShapeAdapter})`.replace('__module_data__', JSON.stringify(modulesMetadata, null, 2))
      result.add(adapterSrc)

      // raw webpack modules
      result.add('(')
      result.add(modules)
      result.add('),')

      const entryPoints = [0]
      result.add(JSON.stringify(entryPoints, null, 2))
      result.add(',')
      result.add(config)

      result.add(')')

      return result
    }


    // its sloppy and lazy but we're just going to start by
    // overwriting the whole pipeline in order to get an MVP
    // and then improve it as needed
    mainTemplate.hooks.render.tap('LavaMoat', (...args) => {
      try {
        return performRender(...args)
      }catch(err){
        console.error(err)
        throw err
      }
    })

  }

  getConfigurationFromPluginOpts(pluginOpts) {
    const allowedKeys = new Set(["writeAutoConfig", "config", "configOverride"])
    const invalidKeys = Reflect.ownKeys(pluginOpts).filter(key => !allowedKeys.has(key))
    if (invalidKeys.length) throw new Error(`Lavamoat - Unrecognized options provided '${invalidKeys}'`)

    const configuration = {
      writeAutoConfig: undefined,
      getConfig: undefined,
      configPath: this.getConfigPath(pluginOpts)
    }

    const defaultOverrideConfig = '/lavamoat-config-override.json'

    if (typeof pluginOpts.config === 'function') {
      configuration.getConfig = pluginOpts.config
    } else {
      const tolerateMissingConfig = ('writeAutoConfig' in pluginOpts)
      configuration.getConfig = () => {

        let configSource
        let primaryConfig

        if (typeof pluginOpts.config === 'string') {
          const configPath = path.resolve(configuration.configPath)
          const isMissing = !fs.existsSync(configPath)
          if (!configuration.configPath) {
            throw new Error('LavaMoat - No configuration path')
          }
          if (isMissing) {
            if (tolerateMissingConfig) {
              return {}
            }
            throw new Error(`Lavamoat - Configuration file not found at path: '${configPath}', use writeAutoConfig option to generate one`)
          }
          configSource = fs.readFileSync(configPath, 'utf8')
          primaryConfig = JSON.parse(configSource)
        } else if (typeof pluginOpts.config === 'object') {
          primaryConfig = pluginOpts.config
        }
        // if override specified, merge
        if (pluginOpts.configOverride) {
          let configOverride = pluginOpts.configOverride
          if (typeof configOverride === 'function') {
            configOverride = pluginOpts.configOverride()
            if (typeof configOverride !== 'string' && typeof configOverride !== 'object') {
              throw new Error('LavaMoat - Config override function must return an object or a string.')
            }
          }

          if (typeof configOverride === 'string') {
            const configOverrideSource = fs.readFileSync(configOverride, 'utf-8')
            configOverride = JSON.parse(configOverrideSource)
          } else if (typeof configOverride !== 'object') {
            throw new Error('LavaMoat - Config Override must be a function, string or object')
          }
          //Ensure override config was written correctly
          validateConfig(configOverride)
          const mergedConfig = mergeDeep(primaryConfig, configOverride)
          return mergedConfig

        } else {
          // Otherwise, still merge but only if it already exists
          const configOverridePath = path.join('./', defaultOverrideConfig)
          const resolvedPath = path.resolve(configOverridePath)
          if (fs.existsSync(resolvedPath)) {
            const configOverrideSource = fs.readFileSync(resolvedPath, 'utf-8')
            const configOverride = JSON.parse(configOverrideSource)
            const mergedConfig = mergeDeep(primaryConfig, configOverride)
            //Overwrite source config file
            const configPath = configuration.configPath
            fs.writeFileSync(configPath, JSON.stringify(mergedConfig, null, 2))
            return mergedConfig
          }
          return primaryConfig
        }
      }
    }



    if (!pluginOpts.writeAutoConfig) {
      // do not trigger parsing of the code for config generation
      configuration.writeAutoConfig = null
    } else if (pluginOpts.writeAutoConfig === true) {
      //output config to a file, path configuration.configPath
      if (!configuration.configPath) {
        throw new Error('LavaMoat - If writeAutoConfig is specified, config must be a string')
      }
      configuration.writeAutoConfig = (configString) => {
        const configPath = path.resolve(configuration.configPath)
        //Ensure parent dir exists
        const configDirectory = path.dirname(configPath)
        mkdirp.sync(configDirectory)
        //Declare override config file path
        const overrideConfigPath = path.join(configDirectory, defaultOverrideConfig)
        //Write config to file
        fs.writeFileSync(configPath, configString)
        //Write default override config to file if it doesn't already exist
        if (!fs.existsSync(overrideConfigPath)) {
          const basicConfig = {
            "resources": {
              "<root>": {
                "packages": {
                }
              }
            }
          }
          fs.writeFileSync(overrideConfigPath, JSON.stringify(basicConfig, null, 2))
          console.warn(`LavaMoat Override Config - wrote to "${overrideConfigPath}"`)
        }
        console.warn(`LavaMoat Config - wrote to "${configPath}"`)
      }
    } else if (typeof pluginOpts.writeAutoConfig === 'function') {
      //to be called with configuration object
      configuration.writeAutoConfig = pluginOpts.writeAutoConfig
    } else {
      // invalid setting, throw an error
      throw new Error('LavaMoat - Unrecognized value for writeAutoConfig')
    }

    return configuration
  }

  getConfigPath(pluginOpts) {
    const defaultPolicy = './lavamoat-config.json'
    if (!pluginOpts.config) {
      return defaultPolicy
    }
    if (typeof pluginOpts.config === 'string') {
      return pluginOpts.config
    }
    return defaultPolicy
  }
}

module.exports = LavaMoat;

// this source is injected into the build
function moduleShapeAdapter(modules) {
  const moduleData = __module_data__
  modules.forEach((moduleFn, moduleId) => {
    // wrap the sourceFn as provided by webpack to match the lavamoat-browserify kernel (temporary)
    // bify: scopedRequire, module, module.exports, null, modulesProxy
    // webpack: module, exports, __webpack_require__
    // coerce requested name into a string for kernel bug workaround
    const wrappedSource = `(function(require, module, exports){\n(${moduleFn})(module, exports, (id) => require(String(id)))\n})`
    // moduleId is just index, but it works

    moduleData[moduleId].source = wrappedSource
    // mapper from requested moduleId -> fetched moduleId
    // (a noop for webpack which already rewrites this)
    // this Proxy just returns the key you asked for
    // sorry to anyone that has to look at this
    moduleData[moduleId].deps = new Proxy({}, {
      // pretend to have every ref
      has (_, key) {
        return true
      },
      // map as a noop
      get (_, key) {
        return parseInt(key, 10)
      },
    })
  })

  return moduleData
}
