// modified from browser-pack
// changes:
// - breakout generateModuleInitializer
// - breakout serializeModule
// - breakout generateBundleLoaderInitial
// - lavamoat: init bundle with loadBundle call
// - lavamoat: expect config as an argument
// - lavamoat: make prelude optional
// - cleanup: var -> const/let
// - cleanup/refactor

const assert = require('assert')
const JSONStream = require('JSONStream')
const through = require('through2')
const umd = require('umd')
const Buffer = require('safe-buffer').Buffer
const path = require('path')
const combineSourceMap = require('combine-source-map')
const jsonStringify = require('json-stable-stringify')
const { wrapIntoModuleInitializer } = require('./sourcemaps')

const defaultPreludePath = path.join(__dirname, '_prelude.js')

function newlinesIn (src) {
  if (!src) return 0
  const newlines = src.match(/\n/g)
  return newlines ? newlines.length : 0
}

module.exports = function ({
  // hook for applying sourcemaps
  onSourcemap = row => row.sourceFile,
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
  prelude,
  // prelude path for sourcemaps
  preludePath = path.relative(basedir, defaultPreludePath).replace(/\\/g, '/'),
  // capabilities config enforced by prelude
  config,
  // prune config to only include packages used in the bundle
  pruneConfig = false,
  externalRequireName,
  sourceRoot,
  sourceMapPrefix
} = {}) {
  // stream/parser wrapping incase raw: false
  const parser = raw ? through.obj() : JSONStream.parse([true])
  const stream = through.obj(
    function (buf, _, next) { parser.write(buf); next() },
    function () { parser.end() }
  )

  // these are decorated for some reason
  stream.standaloneModule = standaloneModule
  stream.hasExports = hasExports

  let first = true
  let entries = []
  const packages = new Set()

  if (includePrelude) {
    assert(prelude, 'LavaMoat CustomPack: must specify a prelude if "includePrelude" is true (default: true)')
  }
  assert(config, 'must specify a config')

  let lineno = 1 + newlinesIn(prelude)
  let sourcemap

  // note: pack stream cant started emitting data until its received its first module
  // this is likely because the pipeline is still being setup
  parser.pipe(through.obj(onModule, onDone))

  return stream

  function onModule (moduleData, _, next) {
    if (first && standalone) {
      const pre = umd.prelude(standalone).trim()
      stream.push(Buffer.from(pre + 'return ', 'utf8'))
    }

    // start of modules
    if (first) stream.push(generateBundleLoaderInitial())

    // initialize sourcemap
    if (!sourcemap) {
      sourcemap = combineSourceMap.create(null, sourceRoot)
      if (includePrelude) {
        sourcemap.addFile(
          { sourceFile: preludePath, source: prelude },
          { line: 0 }
        )
      }
    }

    if (moduleData.sourceFile && !moduleData.nomap) {
      // add current file to the sourcemap
      sourcemap.addFile(
        { sourceFile: moduleData.sourceFile, source: moduleData.source },
        { line: lineno }
      )
    }

    if (pruneConfig) {
      const { packageName } = moduleData
      packages.add(packageName)
    }

    const wrappedSource = [
      (first ? '' : ','),
      JSON.stringify(moduleData.id),
      ':',
      serializeModule(moduleData)
    ].join('')

    stream.push(Buffer.from(wrappedSource, 'utf8'))
    lineno += newlinesIn(wrappedSource)

    first = false
    if (moduleData.entry && moduleData.order !== undefined) {
      entries[moduleData.order] = moduleData.id
    } else if (moduleData.entry) entries.push(moduleData.id)
    next()
  }

  function onDone () {
    if (first) stream.push(generateBundleLoaderInitial())
    entries = entries.filter(function (x) { return x !== undefined })

    // filter the config removing packages that arent included
    let minimalConfig = { resources: {} }
    if (pruneConfig) {
      Object.entries(config.resources || {})
        .filter(([packageName]) => packages.has(packageName))
        .forEach(([packageName, packageConfig]) => {
          minimalConfig.resources[packageName] = packageConfig
        })
    } else {
      minimalConfig = config
    }

    // close the loadBundle request
    stream.push(
      Buffer.from(`},${JSON.stringify(entries)},${JSON.stringify(minimalConfig)})`, 'utf8')
    )

    if (standalone && !first) {
      stream.push(Buffer.from(
        '(' + JSON.stringify(stream.standaloneModule) + ')' +
                    umd.postlude(standalone),
        'utf8'
      ))
    }

    if (sourcemap) {
      let comment = sourcemap.comment()
      if (sourceMapPrefix) {
        comment = comment.replace(
          /^\/\/#/, function () { return sourceMapPrefix }
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
    output += 'LavaMoat.loadBundle({'
    return Buffer.from(output, 'utf8')
  }

  function serializeModule (moduleData) {
    const { id, packageName, packageVersion, source, deps, file } = moduleData
    const wrappedBundle = wrapIntoModuleInitializer(source)
    const sourceMappingURL = onSourcemap(moduleData, wrappedBundle)
    // for now, ignore new sourcemap and just append original filename
    let moduleInitSrc = wrappedBundle.code
    if (sourceMappingURL) moduleInitSrc += `\n//# sourceMappingURL=${sourceMappingURL}`
    // serialize final module entry
    const jsonSerializeableData = {
      id,
      package: packageName,
      packageVersion,
      file,
      deps,
      source: moduleInitSrc
    }
    let serializedEntry = '{'
    Object.entries(jsonSerializeableData).forEach(([key, value]) => {
      serializedEntry += ` ${key}: ${jsonStringify(value)},`
    })
    serializedEntry += '}'

    return serializedEntry
  }
}
