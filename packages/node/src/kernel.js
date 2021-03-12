/* eslint no-eval: 0 */
const fs = require('fs')
const path = require('path')
const resolve = require('resolve')
const { sanitize } = require('htmlescape')
const { generateKernel, packageDataForModule } = require('lavamoat-core')
const { checkForResolutionOverride } = require('./resolutions')
const { resolutionOmittedExtensions } = require('./parseForConfig')
const { createFreshRealmCompartment } = require('./freshRealmCompartment')
const { applySourceTransforms } = require('lavamoat-core')

const nativeRequire = require

module.exports = { createKernel }

function createKernel ({ cwd, lavamoatConfig, debugMode }) {
  const { resolutions } = lavamoatConfig
  const getRelativeModuleId = createModuleResolver({ cwd, resolutions })
  const kernelSrc = generateKernel({ debugMode })
  const createKernel = evaluateWithSourceUrl('LavaMoat/node/kernel', kernelSrc)
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
    prepareModuleInitializerArgs,
    getExternalCompartment,
    globalThisRefs: ['global', 'globalThis']
  })
  return kernel
}

function getExternalCompartment (packageName, packagePolicy) {
  const envPolicy = packagePolicy.env
  if (packagePolicy.env === 'unfrozen') {
    return createFreshRealmCompartment()
  }
  throw new Error(`LavaMoat/node - unrecognized "env" policy setting for package "${packageName}", "${envPolicy}"`)
}

function prepareModuleInitializerArgs (requireRelativeWithContext, moduleObj, moduleData) {
  const require = requireRelativeWithContext
  const module = moduleObj
  const exports = moduleObj.exports
  const __filename = moduleData.file
  const __dirname = path.dirname(__filename)
  require.resolve = (requestedName) => {
    return resolve.sync(requestedName, { basedir: __dirname })
  }
  return [exports, require, module, __filename, __dirname]
}

function createModuleResolver ({ cwd, resolutions }) {
  return function getRelativeModuleId (parentAbsolutePath, requestedName) {
    // handle resolution overrides
    let parentDir = path.parse(parentAbsolutePath).dir
    const { packageName: parentPackageName } = packageDataForModule({ id: parentAbsolutePath, file: parentAbsolutePath })
    const result = checkForResolutionOverride(resolutions, parentPackageName, requestedName)
    if (result) {
      requestedName = result
      // if path is a relative path, it should be relative to the cwd
      if (!path.isAbsolute(result)) {
        parentDir = cwd
      }
    }
    // resolve normally
    const resolved = resolve.sync(requestedName, {
      basedir: parentDir,
      extensions: resolutionOmittedExtensions
    })
    return resolved
  }
}

function loadModuleData (absolutePath) {
  // load builtin modules (eg "fs")
  if (resolve.isCore(absolutePath)) {
    return {
      type: 'builtin',
      file: absolutePath,
      package: absolutePath,
      id: absolutePath,
      // wrapper around unprotected "require"
      moduleInitializer: (exports, require, module) => {
        module.exports = nativeRequire(absolutePath)
      }
    }
  // load compiled native module
  } else if (isNativeModule(absolutePath)) {
    const packageData = packageDataForModule({ file: absolutePath })
    const packageName = packageData.packageName || '<root>'
    return {
      type: 'native',
      file: absolutePath,
      package: packageName,
      id: absolutePath,
      // wrapper around unprotected "require"
      moduleInitializer: (exports, require, module) => {
        module.exports = nativeRequire(absolutePath)
      }
    }
  // load normal user-space module
  } else {
    const moduleContent = fs.readFileSync(absolutePath, 'utf8')
    // apply source transforms
    let transformedContent = moduleContent
    // hash bang
    const contentLines = transformedContent.split('\n')
    if (contentLines[0].startsWith('#!')) {
      transformedContent = contentLines.slice(1).join('\n')
    }

    transformedContent = applySourceTransforms(transformedContent)

    const isJSON = /\.json$/.test(absolutePath)
    // wrap json modules (borrowed from browserify)
    if (isJSON) {
      const sanitizedString = sanitize(transformedContent)
      try {
        // check json validity
        JSON.parse(sanitizedString)
        transformedContent = 'module.exports=' + sanitizedString
      } catch (err) {
        err.message = `While parsing ${absolutePath}: ${err.message}`
        throw err
      }
    }
    // ses needs to take a fucking chill pill
    if (isJSON) {
      transformedContent = transformedContent
        .split('-import-').join('-imp ort-')
    } else {
      transformedContent = transformedContent
        .split('"babel-plugin-dynamic-import-node').join('"babel-plugin-dynamic-imp" + "ort-node')
        .split('"@babel/plugin-proposal-dynamic-import').join('"@babel/plugin-proposal-dynamic-imp" + "ort')
        .split('// Re-export lib/utils, so that consumers can import').join('// Re-export lib/utils, so that consumers can imp_ort')
        .split('// babel-plugin-dynamic-import').join('// babel-plugin-dynamic-imp ort')
        .split('// eslint-disable-next-line import/no-unresolved').join('// eslint-disable-next-line imp_ort/no-unresolved')
    }
    // wrap in moduleInitializer
    // security: ensure module path does not inject code
    if (absolutePath.includes('\n')) throw new Error('invalid newline in module source path')
    const wrappedContent = `(function(exports, require, module, __filename, __dirname){\n${transformedContent}\n})`
    const packageData = packageDataForModule({ file: absolutePath })
    const packageName = packageData.packageName || '<root>'
    return {
      type: 'js',
      file: absolutePath,
      package: packageName,
      source: wrappedContent,
      id: absolutePath
    }
  }
}

function isNativeModule (filename) {
  const fileExtension = filename.split('.').pop()
  return fileExtension === 'node'
}

function evaluateWithSourceUrl (filename, content) {
  return eval(`${content}\n//# sourceURL=${filename}`)
}
