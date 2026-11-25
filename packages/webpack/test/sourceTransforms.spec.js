const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { sources } = require('webpack')
const { runInNewContext } = require('node:vm')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { parse } = require('@babel/parser')
const { default: traverse } = require('@babel/traverse')
const { wrapper } = require('../src/buildtime/wrapper')
const {
  applySourceTransforms,
  needsTransform,
} = require('../src/buildtime/sourceTransforms')

/**
 * @param {string} source
 * @returns {string}
 */
function transform(source) {
  return applySourceTransforms(
    new sources.RawSource(source),
    source,
    'fixture.js'
  )
    .source()
    .toString()
}

test('keeps the webpack and node execution visitors identical', (t) => {
  // Keep the copies in sync until the visitor is extracted to core.
  const webpackVisitor = readFileSync(
    join(__dirname, '../src/buildtime/exec-visitor.mjs'),
    'utf8'
  )
  const nodeVisitor = readFileSync(
    join(__dirname, '../../node/src/exec/exec-visitor.js'),
    'utf8'
  )

  t.is(webpackVisitor, nodeVisitor)
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
  t.notRegex(result, /<!--|-->/)
})

test('preserves the meaning of an HTML comment containing a closing brace', (t) => {
  const result = transform('result = 1<!--}-->1\n')
  const context = { result: 0 }

  runInNewContext(result, context)

  t.is(context.result, 1)
  t.notRegex(result, /<!--|-->/)
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
  })

  t.false(sourceChanged)
})

test('transforms import-like text within a longer string', (t) => {
  const { wrappedSource, sourceChanged } = wrapper({
    source: new sources.RawSource('const text = "prefiximport()";'),
    id: 'fixture.js',
    runtimeKit: [],
    evalKitFunctionName: 'getEvalKit',
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
  })
  const result = wrappedSource.source().toString()

  t.true(sourceChanged)
  t.notRegex(result, /#!/)
  t.regex(result, /const value = 1/)
})
