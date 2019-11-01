const {
  ConcatSource,
  OriginalSource,
  PrefixSource,
  RawSource
} = require('webpack-sources')
const generatePrelude = require('lavamoat-browserify/src/generatePrelude')
const { packageDataForModule } = require('lavamoat-browserify/src/packageData')

class LavaMoat {

  apply(compiler) {
    compiler.hooks.compilation.tap(
      this.constructor.name,
      (compilation) => this.handleEmit(compilation).catch(
        (error) => compilation.errors.push(error))
    );
  }

  async handleEmit(compilation) {

    const { mainTemplate } = compilation

    // its sloppy and lazy but we're just going to start by
    // overwriting the whole pipeline in order to get an MVP
    // and then improve it as needed
    mainTemplate.hooks.render.tap('LavaMoat', (bootstrapSource, chunk, hash, moduleTemplate, dependencyTemplates) => {
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

      for (const moduleData of chunk._modules) {
        const file = moduleData.request
        if (!file) return

        const { packageName, packageVersion } = packageDataForModule({ file })

        // json serializeable module metadata
        modulesMetadata[moduleData.id] = {
          id: moduleData.id,
          // TODO: "entry" slug should happen elsewhere
          package: packageName || '<entry>',
          packageName,
          packageVersion,
          file: file,
        }
      }

      // module shape adapter with inject module metadata
      result.add('(')

      const adapterSrc = `(${moduleShapeAdapter})`.replace('__module_data__', JSON.stringify(modulesMetadata, null, 2))
      result.add(adapterSrc)

      // raw webpack modules
      result.add('(')
      result.add(modules)
      result.add('),')

      // empty argument (browserify cruft)
      result.add('null,')

      const entryPoints = [0]
      result.add(JSON.stringify(entryPoints, null, 2))

      result.add(')')

      return result
    })

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
