const fs = require('fs')
const path = require('path')
const resolve = require('resolve')
const { sanitize } = require('htmlescape')
const { generateKernel, packageDataForModule } = require('lavamoat-core')
const { checkForResolutionOverride } = require('./resolutions')

module.exports = { createKernel }


function createKernel ({ cwd, lavamoatConfig, debugMode }) {
  const { resolutions } = lavamoatConfig
  const getRelativeModuleId = createModuleResolver({ cwd, resolutions })
  const createKernel = eval(generateKernel({ debugMode }))
  const kernel = createKernel({
    lavamoatConfig,
    loadModuleData,
    getRelativeModuleId,
  })
  return kernel
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
    const resolved = resolve.sync(requestedName, { basedir: parentDir })
    return resolved
  }
}

function loadModuleData (absolutePath) {
  if (resolve.isCore(absolutePath)) {
    // for core modules (eg "fs")
    return {
      file: absolutePath,
      package: absolutePath,
      // wrapper around unprotected "require"
      moduleInitializer: (_, module) => {
        module.exports = require(absolutePath)
      }
    }
  } else {
    // load normal user-space module
    const moduleContent = fs.readFileSync(absolutePath, 'utf8')
    // apply source transforms
    let transformedContent = moduleContent
      // html comment
      .split('-->').join('-- >')
      // use indirect eval
      .split(' eval(').join(' (eval)(')
    // wrap json modules (borrowed from browserify)
    if (/\.json$/.test(absolutePath)) {
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
    // wrap in moduleInitializer
    const wrappedContent = `(function(require,module,exports){\n${transformedContent}\n})`
    const packageData = packageDataForModule({ file: absolutePath })
    const packageName = packageData.packageName || '<root>'
    return {
      file: absolutePath,
      package: packageName,
      source: wrappedContent,
      sourceString: wrappedContent
    }
  }
}