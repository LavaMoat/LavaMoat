const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { sources } = require('webpack')
const { runInNewContext } = require('node:vm')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { wrapper } = require('../src/buildtime/wrapper')
const { parseForPolicy } = require('../../lavamoat-node/src/parseForPolicy')
const { createKernel } = require('../../lavamoat-node/src/kernel')
const { loadCanonicalNameMap } = require('@lavamoat/aa')
const {
  applySourceTransforms,
  needsTransform,
} = require('../src/buildtime/sourceTransforms')
const {
  applySourceTransforms: applyLegacyTransforms,
} = require('../src/buildtime/sourceTransformsLegacy')

/**
 * @param {string} source
 * @returns {string}
 */
function transform(source) {
  const result = applySourceTransforms(
    new sources.RawSource(source),
    source,
    'fixture.js'
  )
  return typeof result === 'string' ? result : result.source().toString()
}

test('keeps the webpack and node execution visitors identical', (t) => {
  // Keep the copies in sync until the visitor is extracted to core.
  const webpackVisitor = readFileSync(
    join(__dirname, '../src/buildtime/esm/exec-visitor.js'),
    'utf8'
  )
  const nodeVisitor = readFileSync(
    join(__dirname, '../../node/src/exec/exec-visitor.js'),
    'utf8'
  )

  t.is(webpackVisitor, nodeVisitor)
})

test('legacy LavaMoat scans both implementations and runs default transforms', async (t) => {
  const projectRoot = join(__dirname, '..')
  const entryId = join(__dirname, '../src/plugin.js')
  const lavamoatPolicy = await parseForPolicy({
    projectRoot,
    entryId,
    includeDebugInfo: true,
  })
  t.truthy(
    lavamoatPolicy.debugInfo[
      join(__dirname, '../src/buildtime/esm/exec-visitor.js')
    ]
  )
  const canonicalNameMap = await loadCanonicalNameMap({
    rootDir: projectRoot,
    includeDevDeps: true,
  })
  const kernel = createKernel({
    projectRoot,
    lavamoatPolicy,
    canonicalNameMap,
    scuttleGlobalThis: { enabled: false },
  })
  t.is(typeof kernel.internalRequire(entryId), 'function')
  const sandboxedWrapper = kernel.internalRequire(
    join(__dirname, '../src/buildtime/wrapper.js')
  ).wrapper
  const transformSource = kernel.internalRequire(
    join(__dirname, '../src/buildtime/sourceTransformsLegacy.js')
  ).applySourceTransforms
  const { wrappedSource, sourceChanged } = sandboxedWrapper({
    source: new sources.RawSource('eval("1");'),
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource,
  })

  t.true(sourceChanged)
  t.regex(wrappedSource.source().toString(), /\(0,eval\)\("1"\)/)
})

test('rewrites direct eval calls but leaves member calls alone', (t) => {
  const result = transform(
    'const direct = eval("value"); const member = object.eval("value");'
  )

  t.regex(result, /\(0,\s*eval\)\("value"\)/)
  t.regex(result, /object\.eval\("value"\)/)
})

test('leaves dynamic import expressions to Endo', (t) => {
  const result = transform('const loaded = import("chunk");')

  t.regex(result, /\bimport\s*\("chunk"\)/)
  t.notRegex(result, /__import__/) // ensure we don't regress to the historical way this was translated
})

test('defangs evasive patterns in comments and string literals', (t) => {
  const result = transform(
    '// import("module") <!-- -->\nconst text = "import() eval()";'
  )

  t.notRegex(result, /import\s*\(/)
  t.notRegex(result, /(^|[^.])\beval\s*\(/)
  t.notRegex(result, /<!--|--!?>/)
})

test('preserves the meaning of an HTML comment containing a closing brace', (t) => {
  const result = transform('result = 1<!--}-->1\n')
  const context = { result: 0 }

  runInNewContext(result, context)

  t.is(context.result, 1)
  t.notRegex(result, /<!--|--!?\s*>/)
})

test('defangs evasive patterns in untagged templates but preserves tagged templates', (t) => {
  const result = transform(
    'const plain = `import() eval()`; const tagged = tag`import() eval()`;'
  )

  t.notRegex(result, /const plain = `import\(\) eval\(\)`/)
  t.regex(result, /tag`import\(\) eval\(\)`/)
})

test('preserves string and template values when Endo and eval transforms overlap', (t) => {
  const source = 'result = ["import() eval()", `import() eval()\\n`];'
  const result = transform(source)
  const context = { result: [] }

  runInNewContext(result, context)

  t.deepEqual(Array.from(context.result), [
    'import() eval()',
    'import() eval()\n',
  ])
  t.notRegex(result, /\bimport\s*\(|(^|[^.])\beval\s*\(/)
})

test('uses Endo evasions for method names and regular expressions', (t) => {
  const source =
    'result = [{ import() { return 1 } }.import(), /import(abc)/.test("importabc")];'
  const result = transform(source)
  const context = { result: [] }

  runInNewContext(result, context)

  t.deepEqual(Array.from(context.result), [1, true])
  t.notRegex(result, /(^|[^.]|\.\.\.)\bimport\s*\(/)
})

test('rewrites eval calls obscured by identifier escapes', (t) => {
  for (const source of ['\\u0065val("1");', 'e\\u0076al("1");']) {
    const { wrappedSource, sourceChanged } = wrapper({
      source: new sources.RawSource(source),
      id: 'fixture.js',
      runtimeKit: [],
      evalKitFunctionName: 'getEvalKit',
      transformSource: applySourceTransforms,
    })

    t.true(sourceChanged)
    const ast = parse(wrappedSource.source().toString(), {
      sourceType: 'script',
    })
    let foundIndirectEval = false
    traverse(ast, {
      CallExpression({ node }) {
        const callee = node.callee
        if (
          callee.type === 'SequenceExpression' &&
          callee.expressions.length === 2 &&
          callee.expressions[0].type === 'NumericLiteral' &&
          callee.expressions[0].value === 0 &&
          callee.expressions[1].type === 'Identifier' &&
          callee.expressions[1].name === 'eval'
        ) {
          foundIndirectEval = true
        }
      },
    })
    t.true(foundIndirectEval)
  }
})

test('detects evasive syntax without triggering on unrelated eval or import text', (t) => {
  for (const source of [
    'eval ("1")',
    'import ("module")',
    'import .meta',
    'import /* comment */ ("module")',
    'import // comment\n("module")',
    'prefiximport()',
    `${'<'}!--`,
    `--${'>'}`,
    'value-- > 0',
    '#!/usr/bin/env node',
    '\\u0065val("1")',
  ]) {
    t.true(needsTransform(source), 'expected to need transform: ' + source)
    t.true(needsTransform(source), 'repeated checks are independent')
  }
  for (const source of [
    'const evalResult = 1;',
    'const value = evaluate;',
    'const value = eval;',
    'const important = 1;',
    'import value from "module";',
  ]) {
    t.false(needsTransform(source), 'expected to NOT need transform: ' + source)
  }
})

test('skips parsing and source-map work for source without evasive patterns', (t) => {
  const source = new sources.RawSource('const value = 42;')
  source.map = () => {
    throw new Error('Unexpected source transform')
  }

  const { sourceChanged } = wrapper({
    source,
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: applySourceTransforms,
  })

  t.false(sourceChanged)
})

test('transforms import-like text within a longer string', (t) => {
  const { wrappedSource, sourceChanged } = wrapper({
    source: new sources.RawSource('const text = "prefiximport()";'),
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: applySourceTransforms,
  })

  t.true(sourceChanged)
  t.notRegex(wrappedSource.source().toString(), /import\(\)/)
})

test('transforms eval text hidden by an escape in a string', (t) => {
  const { wrappedSource, sourceChanged } = wrapper({
    source: new sources.RawSource('const text = "\\u0065val()";'),
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: applySourceTransforms,
  })

  t.true(sourceChanged)
  t.notRegex(wrappedSource.source().toString(), /\\u0065val\(\)/)
})

test('strips hashbangs like the Node execution visitor', (t) => {
  const { wrappedSource, sourceChanged } = wrapper({
    source: new sources.RawSource('#!/usr/bin/env node\nconst value = 1;'),
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: applySourceTransforms,
  })
  const result = wrappedSource.source().toString()

  t.true(sourceChanged)
  t.notRegex(result, /#!/)
  t.regex(result, /const value = 1/)
})

test('applies injected legacy replacements', (t) => {
  const { wrappedSource, sourceChanged } = wrapper({
    source: new sources.RawSource('eval("1"); import("module");'),
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: applyLegacyTransforms,
  })

  t.true(sourceChanged)
  t.regex(wrappedSource.source().toString(), /\(0,eval\)\("1"\)/)
  t.regex(wrappedSource.source().toString(), /__import__\("module"\)/)
})

test('legacy transforms handle import dot and HTML comment end variants', (t) => {
  for (const [source, expected] of [
    ['import.meta', '__import__.meta'],
    ['import \t.meta', '__import__ \t.meta'],
    [`--${'>'}`, '-- >'],
    [`--!${'>'}`, '--! >'],
  ]) {
    const result = applyLegacyTransforms(new sources.RawSource(source), source)
    t.not(typeof result, 'string', source)
    t.is(result.source().toString(), expected)
  }
})

test('preserves the original source and sourcemap when a transform makes no changes', (t) => {
  const sourceString = 'const loaded = import("module");'
  const source = new sources.OriginalSource(sourceString, 'original.js')
  const { wrappedSource, sourceChanged } = wrapper({
    source,
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: applySourceTransforms,
  })

  t.false(sourceChanged)
  const map = wrappedSource.map()
  t.truthy(map)
  t.true(map?.sources.includes('original.js'))
})

test('treats a returned Source as changed without reading it when checks are disabled', (t) => {
  const source = new sources.RawSource('const value = 42;')
  const transformed = new sources.RawSource('const value = 42;')
  transformed.source = () => {
    throw new Error('Unexpected transformed source read')
  }
  const { wrappedSource, sourceChanged } = wrapper({
    source,
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
    transformSource: () => transformed,
    runChecks: false,
  })

  t.true(sourceChanged)
  t.true(wrappedSource.getChildren().includes(transformed))
})

test('validates a returned Source when checks are enabled', (t) => {
  t.throws(
    () =>
      wrapper({
        source: new sources.RawSource('const value = 42;'),
        id: 'fixture.js',
        runtimeKit: [],
        evalKitFunctionName: 'getEvalKit',
        transformSource: () => new sources.RawSource('const value = ;'),
      }),
    { message: /^E_VALIDATION/ }
  )
})
