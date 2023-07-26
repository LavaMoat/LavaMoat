// modified from browser-pack
// changes:
// - breakout generateModuleInitializer
// - breakout serializeModule
// - breakout generateBundleLoaderInitial
// - lavamoat: init bundle with loadBundle call
// - lavamoat: expect policy as an argument
// - lavamoat: make prelude optional
// - cleanup: var -> const/let
// - cleanup/refactor

const fs = require('fs')
const path = require('path')
const assert = require('assert')
const JSONStream = require('JSONStream')
const through = require('through2')
const umd = require('umd')
// eslint-disable-next-line n/prefer-global/buffer
const { Buffer } = require('buffer')
const combineSourceMap = require('combine-source-map')
const convertSourceMap = require('convert-source-map')
const jsonStringify = require('json-stable-stringify')

const defaultPreludePath = path.join(__dirname, '_prelude.js')

function newlinesIn (src) {
  if (!src) {
    return 0
  }
  const newlines = src.match(/\n/g)
  return newlines ? newlines.length : 0
}

module.exports = createPacker

function createPacker({
  // hook for applying sourcemaps
  sourcePathForModule = row => row.sourceFile,
  // input is (true:) objects (false:) json strings
  raw = false,
  standalone = false,
  standaloneModule = false,
  // since we always define a global loadModule fn, we ignore this legacy bify option
  hasExports = false,
  basedir = process.cwd(),
  // include prelude in bundle
  includePrelude = true,
  // must be specified
  prelude = fs.readFileSync(path.join(__dirname, 'runtime.js'), 'utf8'),
  // prelude path for sourcemaps
  preludePath = path.relative(basedir, defaultPreludePath).replace(/\\/g, '/'),
  // capabilities policy enforced by prelude
  policy = {},
  // prune policy to only include packages used in the bundle
  prunePolicy = false,
  externalRequireName,
  sourceRoot,
  sourceMapPrefix,
  bundleWithPrecompiledModules = true,
  scuttleGlobalThis = {},
  scuttleGlobalThisExceptions,
} = {}) {
  // stream/parser wrapping incase raw: false
  const parser = raw ? through.obj() : JSONStream.parse([true])
  const stream = through.obj(
    function (buf, _, next) {
      parser.write(buf); next()
    },
    function () {
      parser.end()
    },
  )

  // these are decorated for some reason
  stream.standaloneModule = standaloneModule
  stream.hasExports = hasExports

  let first = true
  let entryFiles = []
  const packages = new Set()
  let lineno = 1
  let sourcemap

  if (includePrelude) {
    assert(prelude, 'LavaMoat CustomPack: must specify a prelude if "includePrelude" is true (default: true)')
  }
  assert(policy, 'must specify a policy')

  if (scuttleGlobalThisExceptions) {
    console.warn('Lavamoat - "scuttleGlobalThisExceptions" is deprecated. Use "scuttleGlobalThis.exceptions" instead.')
    if (scuttleGlobalThis === true) {
      scuttleGlobalThis = {enabled: true}
    }
  }
  const exceptions = scuttleGlobalThis?.exceptions || scuttleGlobalThisExceptions
  scuttleGlobalThis.exceptions = exceptions

  // toString regexps if there's any
  if (exceptions) {
    for (let i = 0; i < exceptions.length; i++) {
      exceptions[i] = String(exceptions[i])
    }
  }

  prelude = prelude.replace('__lavamoatSecurityOptions__', JSON.stringify({
    scuttleGlobalThis,
  }))

  // note: pack stream cant started emitting data until its received its first module
  // this is because the browserify pipeline is leaky until its finished being setup
  parser.pipe(through.obj(onModule, onDone))

  return stream


  function onModule (moduleData, _, next) {
    if (first && standalone) {
      const pre = umd.prelude(standalone).trim()
      stream.push(Buffer.from(pre + 'return ', 'utf8'))
    }

    // start of modules
    if (first) {
      const loaderInitial = generateBundleLoaderInitial()
      lineno += newlinesIn(loaderInitial.toString())
      stream.push(loaderInitial)
    }

    // initialize sourcemap
    if (!sourcemap) {
      sourcemap = combineSourceMap.create(null, sourceRoot)
      if (includePrelude) {
        sourcemap.addFile(
          { sourceFile: preludePath, source: prelude },
          { line: 0 },
        )
      }
    }

    const moduleEntryPrefix = (first ? '' : ',\n')
    lineno += newlinesIn(moduleEntryPrefix)
    stream.push(Buffer.from(moduleEntryPrefix, 'utf8'))

    if (prunePolicy) {
      const { packageName } = moduleData
      packages.add(packageName)
    }

    const sourceMeta = prepareModuleInitializer(moduleData, sourcePathForModule, bundleWithPrecompiledModules)
    const wrappedSource = serializeModule(moduleData, sourceMeta)

    if (moduleData.sourceFile && !moduleData.nomap) {
      // add current file to the sourcemap
      sourcemap.addFile(
        { sourceFile: moduleData.sourceFile, source: moduleData.source },
        { line: lineno + sourceMeta.offset },
      )
    }

    stream.push(Buffer.from(wrappedSource, 'utf8'))
    lineno += newlinesIn(wrappedSource)

    first = false
    if (moduleData.entry && moduleData.order !== undefined) {
      entryFiles[moduleData.order] = moduleData.id
    } else if (moduleData.entry) {
      entryFiles.push(moduleData.id)
    }
    next()
  }

  function onDone () {
    if (first) {
      stream.push(generateBundleLoaderInitial())
    }
    entryFiles = entryFiles.filter(function (x) {
      return x !== undefined
    })

    // filter the policy removing packages that arent included
    let minimalPolicy = { resources: {} }
    if (prunePolicy) {
      Object.entries(policy.resources || {})
        .filter(([packageName]) => packages.has(packageName))
        .forEach(([packageName, packagePolicy]) => {
          minimalPolicy.resources[packageName] = packagePolicy
        })
    } else {
      minimalPolicy = policy
    }

    // close the loadBundle request
    stream.push(
      Buffer.from(`],${JSON.stringify(entryFiles)},${JSON.stringify(minimalPolicy)})`, 'utf8'),
    )

    if (standalone && !first) {
      stream.push(Buffer.from(
        '(' + JSON.stringify(stream.standaloneModule) + ')' +
                    umd.postlude(standalone),
        'utf8',
      ))
    }

    if (sourcemap) {
      let comment = sourcemap.comment()
      if (sourceMapPrefix) {
        comment = comment.replace(
          /^\/\/#/, function () {
            return sourceMapPrefix
          },
        )
      }
      stream.push(Buffer.from('\n' + comment + '\n', 'utf8'))
    }
    if (!sourcemap && !standalone) {
      stream.push(Buffer.from(';\n', 'utf8'))
    }

    stream.push(null)
  }

  function generateBundleLoaderInitial () {
    let output = ''
    // append prelude if requested
    if (includePrelude) {
      output += `${prelude};\n`
    }
    // append start of loadBundle call
    output += 'LavaPack.loadBundle([\n'
    return Buffer.from(output, 'utf8')
  }

  function serializeModule (moduleData, sourceMeta) {
    const { id, packageName, source, deps, file } = moduleData
    const relativeFilePath = file && path.relative(basedir, file)
    // for now, ignore new sourcemap and just append original filename
    // serialize final module entry
    const jsonSerializeableData = {
      // id,
      package: packageName,
      file: relativeFilePath,
      // deps,
      // source: sourceMeta.code
    }
    const moduleInitializer = sourceMeta.code
    let serializedEntry = `[${jsonStringify(id)}, ${jsonStringify(deps)}, ${moduleInitializer}, {`
    // add metadata
    Object.entries(jsonSerializeableData).forEach(([key, value]) => {
      // skip missing values
      if (value === undefined) {
        return
      }
      serializedEntry += `${key}:${jsonStringify(value)},`
    })
    serializedEntry += '}]'

    return serializedEntry
  }
}

function prepareModuleInitializer (moduleData, sourcePathForModule, bundleWithPrecompiledModules) {
  const normalizedSource = moduleData.source.split('\r\n').join('\n')
  // extract sourcemaps
  const sourceMeta = extractSourceMaps(normalizedSource)
  // create wrapper + update sourcemaps
  const newSourceMeta = wrapInModuleInitializer(moduleData, sourceMeta, sourcePathForModule, bundleWithPrecompiledModules)
  return newSourceMeta
}

function extractSourceMaps (sourceCode) {
  const converter = convertSourceMap.fromSource(sourceCode)
  // if (!converter) throw new Error('Unable to find original inlined sourcemap')
  const maps = converter && converter.toObject()
  const code = convertSourceMap.removeComments(sourceCode)
  return { code, maps }
}

function wrapInModuleInitializer (moduleData, sourceMeta, sourcePathForModule, bundleWithPrecompiledModules) {
  const filename = encodeURI(String(moduleData.file))
  let moduleWrapperSource
  if (bundleWithPrecompiledModules) {
    moduleWrapperSource = (
      `function(){
  with (this.scopeTerminator) {
  with (this.globalThis) {
    return function() {
      'use strict';
      // source: ${filename}
      return function (require, module, exports) {
__MODULE_CONTENT__
      };
    };
  }
  }
}`
    )
  } else {
    moduleWrapperSource = `// source: ${filename}\nfunction(require, module, exports){\n__MODULE_CONTENT__\n}`
  }
  const [start, end] = moduleWrapperSource.split('__MODULE_CONTENT__')
  // im not entirely sure why the offset is 2 and not 1
  const offset = start.split('\n').length - 2
  const code = `${start}${sourceMeta.code}${end}`
  const newSourceMeta = { code, offset }
  return newSourceMeta
}
