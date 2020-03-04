// modified from browser-pack
// changes:
// - breakout generateModuleInitializer
// - breakout bundleEntryForModule
// - breakout generateFirstLine
// - lavamoat: call loadBundle with correct args
// - lavamoat: expect config as an argument
// - cleanup: var -> const/let

const assert = require('assert')
const JSONStream = require('JSONStream')
const defined = require('defined')
const through = require('through2')
const umd = require('umd')
const Buffer = require('safe-buffer').Buffer
const path = require('path')

const combineSourceMap = require('combine-source-map')

const defaultPreludePath = path.join(__dirname, '_prelude.js')

function newlinesIn (src) {
  if (!src) return 0
  const newlines = src.match(/\n/g)
  return newlines ? newlines.length : 0
}

module.exports = function (opts) {
  if (!opts) opts = {}
  const parser = opts.raw ? through.obj() : JSONStream.parse([true])
  const stream = through.obj(
    function (buf, _, next) { parser.write(buf); next() },
    function () { parser.end() }
  )
  parser.pipe(through.obj(write, end))
  stream.standaloneModule = opts.standaloneModule
  stream.hasExports = opts.hasExports

  let first = true
  let entries = []
  const basedir = defined(opts.basedir, process.cwd())
  const prelude = opts.prelude
  assert(prelude, 'must specify a prelude')
  const config = opts.config
  assert(config, 'must specify a config')
  const preludePath = opts.preludePath ||
        path.relative(basedir, defaultPreludePath).replace(/\\/g, '/')

  let lineno = 1 + newlinesIn(prelude)
  let sourcemap

  if (opts.generateModuleInitializer && opts.bundleEntryForModule) {
    throw new Error('LavaMoat CustomPack: conflicting options for "generateModuleInitializer" and "bundleEntryForModule". Can only set one.')
  }

  opts.generateModuleInitializer = opts.generateModuleInitializer || generateModuleInitializer
  opts.bundleEntryForModule = opts.bundleEntryForModule || bundleEntryForModule

  return stream

  function generateModuleInitializer (row) {
    return [
      'function moduleInitializer (require,module,exports) {\n',
      combineSourceMap.removeComments(row.source),
      '\n}'
    ].join('')
  }

  function bundleEntryForModule (row) {
    return [
      '[',
      opts.generateModuleInitializer(row),
      ',',
      '{' + Object.keys(row.deps || {}).sort().map(function (key) {
        return JSON.stringify(key) + ':' +
                JSON.stringify(row.deps[key])
      }).join(',') + '}',
      ']'
    ].join('')
  }

  function write (row, enc, next) {
    if (first && opts.standalone) {
      const pre = umd.prelude(opts.standalone).trim()
      stream.push(Buffer.from(pre + 'return ', 'utf8'))
    } else if (first && stream.hasExports) {
      const pre = opts.externalRequireName || 'require'
      stream.push(Buffer.from(pre + '=', 'utf8'))
    }

    // start of modules
    if (first) stream.push(genereateFirstLine())

    if (row.sourceFile && !row.nomap) {
      if (!sourcemap) {
        sourcemap = combineSourceMap.create(null, opts.sourceRoot)
        sourcemap.addFile(
          { sourceFile: preludePath, source: prelude },
          { line: 0 }
        )
      }
      sourcemap.addFile(
        { sourceFile: row.sourceFile, source: row.source },
        { line: lineno }
      )
    }

    const wrappedSource = [
      (first ? '' : ','),
      JSON.stringify(row.id),
      ':',
      opts.bundleEntryForModule(row)
    ].join('')

    stream.push(Buffer.from(wrappedSource, 'utf8'))
    lineno += newlinesIn(wrappedSource)

    first = false
    if (row.entry && row.order !== undefined) {
      entries[row.order] = row.id
    } else if (row.entry) entries.push(row.id)
    next()
  }

  function end () {
    if (first) stream.push(genereateFirstLine())
    entries = entries.filter(function (x) { return x !== undefined })

    // close the loadBundle request
    stream.push(
      Buffer.from(`},${JSON.stringify(entries)},${JSON.stringify(config)})`, 'utf8')
    )

    if (opts.standalone && !first) {
      stream.push(Buffer.from(
        '(' + JSON.stringify(stream.standaloneModule) + ')' +
                    umd.postlude(opts.standalone),
        'utf8'
      ))
    }

    if (sourcemap) {
      let comment = sourcemap.comment()
      if (opts.sourceMapPrefix) {
        comment = comment.replace(
          /^\/\/#/, function () { return opts.sourceMapPrefix }
        )
      }
      stream.push(Buffer.from('\n' + comment + '\n', 'utf8'))
    }
    if (!sourcemap && !opts.standalone) {
      stream.push(Buffer.from(';\n', 'utf8'))
    }

    stream.push(null)
  }

  function genereateFirstLine () {
    return Buffer.from(prelude + '\n;LavaMoat.loadBundle({', 'utf8')
  }
}
