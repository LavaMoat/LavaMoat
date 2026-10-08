// simple performance test of detecting globals
const { glob, readFile } = require('node:fs/promises')
const { resolve } = require('node:path')
const { parse } = require('@babel/parser')
const { findGlobals } = require('../src/findGlobals')

// TODO: switch to node:bench when it stabilizes
const { bench } = require('../../aa/test/bench')

async function prepareAst() {
  const nodeModules = resolve(__dirname, '../../../node_modules')
  const maxSourceLength = 20 * 1024 * 1024
  const asts = []
  let totalSourceLength = 0

  for await (const file of glob('**/*.js', {
    cwd: nodeModules,
    withFileTypes: true,
  })) {
    if (!file.isFile()) {
      continue
    }
    let source = await readFile(resolve(file.parentPath, file.name), 'utf8')
    if (source.length < 100 || source.length > 500 * 1024) {
      continue
    }
    if (totalSourceLength + source.length > maxSourceLength) {
      break
    }

    try {
      asts.push(parse(source, { sourceType: 'unambiguous' }))
      totalSourceLength += source.length
    } catch {}
  }

  return asts
}

function benchmark(asts) {
  // warmup
  findGlobals(asts.pop())

  let astIndex = 0
  return bench(
    () => {
      findGlobals(asts[astIndex++])
    },
    'findGlobals',
    asts.length
  )
}

async function test() {
  console.log('prepare')
  const asts = await prepareAst()
  console.log(`prepared ${asts.length} ASTs`)
  console.log('run benchmark')
  console.log(benchmark(asts))
}

test()
