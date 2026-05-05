import test from 'ava'
import { parse } from '@babel/parser'
import generate from '@babel/generator'
import traverse from '@babel/traverse'
import { createExecVisitor } from '../../../src/exec/exec-visitor.js'

const { default: traverseBabel } = traverse
const { default: generateBabel } = generate

/**
 * Applies {@link createExecVisitor} to source and returns the generated code.
 *
 * @param {string} source
 * @returns {string}
 */
const applyTransform = (source) => {
  const ast = parse(source, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    tokens: true,
  })
  const pass = createExecVisitor()
  traverseBabel(ast, pass.visitor)
  const { code } = generateBabel(ast, { retainLines: true }, source)
  return code
}

test('leaves ordinary code unchanged', (t) => {
  const source = 'console.log("hello");'
  const result = applyTransform(source)
  t.true(result.includes('console.log("hello")'))
})

test('rewrites direct eval to indirect eval', (t) => {
  const source = 'const result = eval("1 + 1");'
  const result = applyTransform(source)
  t.false(result.includes('eval("1 + 1")'), 'should not have direct eval')
  // Should contain (0, eval) pattern
  t.true(
    result.includes('(0,') && result.includes('eval'),
    'should have indirect eval'
  )
})

test('rewrites multiple eval calls', (t) => {
  const source = 'eval("foo"); eval("bar");'
  const result = applyTransform(source)
  // Direct eval syntax should not appear: after transform, eval(...) becomes (0, eval)(...)
  // so 'eval(' no longer appears in the output.
  t.false(
    result.includes('eval("foo")'),
    'first direct eval should be rewritten'
  )
  t.false(
    result.includes('eval("bar")'),
    'second direct eval should be rewritten'
  )
})

test('does not rewrite method call eval', (t) => {
  const source = 'globalThis.eval("test");'
  const result = applyTransform(source)
  t.true(
    result.includes('globalThis.eval'),
    'member access eval should be unchanged'
  )
})

test('defangs eval() inside line comments', (t) => {
  const source = `// whether to check 'eval()' calls\nvar x = 1;`
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'comment should not match SES direct-eval regex'
  )
  t.true(result.includes('eval_'), 'comment should retain a defanged token')
})

test('defangs eval() inside block / JSDoc comments', (t) => {
  const source = [
    '/**',
    " * @param {boolean} [opts.ignoreEval=false]- whether to check 'eval()' calls",
    ' */',
    'function foo() {}',
  ].join('\n')
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'JSDoc comment should not match SES direct-eval regex'
  )
})

test('does not defang member-access eval inside comments', (t) => {
  const source = `// see foo.eval(bar)\nvar x = 1;`
  const result = applyTransform(source)
  t.true(
    result.includes('foo.eval(bar)'),
    'member-access eval in comment should be left alone (SES allows it)'
  )
})

test('does not touch comments without an eval pattern', (t) => {
  const source = `// just a normal comment about evaluation\nvar x = 1;`
  const result = applyTransform(source)
  t.true(
    result.includes('just a normal comment about evaluation'),
    'unrelated comment should be unchanged'
  )
})

test('still rewrites direct eval calls when comments are present', (t) => {
  const source = [
    "// docs about 'eval()' calls",
    'const result = eval("1 + 1");',
  ].join('\n')
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'neither comment nor code should match SES direct-eval regex'
  )
  t.true(
    result.includes('(0,') && result.includes('eval'),
    'code should still be rewritten to indirect eval'
  )
})

test('splits string literals containing eval() to defeat SES regex', (t) => {
  const source = `var x = "eval()";`
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'string literal should not match SES direct-eval regex'
  )
  t.true(
    result.includes('"e"') && result.includes('"val()"'),
    'string should be split into "e" + "val()"'
  )
})

test('preserves runtime value of split eval() string literal', (t) => {
  const source = `var x = "eval()";`
  const result = applyTransform(source)
  // Evaluate the transformed snippet in an isolated function scope and
  // recover the value to verify semantics didn't drift.
  const recover = new Function(`${result}\nreturn x;`)
  t.is(recover(), 'eval()')
})

test('splits multiple eval() occurrences in a single string literal', (t) => {
  const source = `var x = "eval() and eval(again)";`
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'no eval-pattern should survive in the source'
  )
  const recover = new Function(`${result}\nreturn x;`)
  t.is(recover(), 'eval() and eval(again)')
})

test('does not split string literals without eval(', (t) => {
  const source = `var x = "evaluate this expression";`
  const result = applyTransform(source)
  t.true(
    result.includes('"evaluate this expression"'),
    'string without eval-pattern should be left alone'
  )
})

test('does not split string literals with member-access eval', (t) => {
  const source = `var x = "foo.eval(bar)";`
  const result = applyTransform(source)
  t.true(
    result.includes('"foo.eval(bar)"'),
    'member-access eval in a string is acceptable to SES'
  )
})

test('handles string literals with eval() alongside live direct eval', (t) => {
  const source = [
    'var bailout = "eval()";',
    'var result = eval("1 + 1");',
  ].join('\n')
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'neither string nor code should match SES direct-eval regex'
  )
  t.true(
    result.includes('(0,') && result.includes('eval'),
    'live eval should still be rewritten to indirect eval'
  )
})

test('escapes eval() inside bare template literals', (t) => {
  const source = 'var x = `eval()`;'
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'template should not match SES direct-eval regex'
  )
  t.true(
    result.includes('\\u0065val()'),
    'template raw should contain escaped \\u0065val()'
  )
})

test('preserves runtime cooked value of escaped template literal', (t) => {
  const source = 'var x = `eval()`;'
  const result = applyTransform(source)
  const recover = new Function(`${result}\nreturn x;`)
  t.is(recover(), 'eval()')
})

test('escapes eval() in template quasis around interpolations', (t) => {
  const source = 'var x = `eval(${"foo"}) and eval(${"bar"})`;'
  const result = applyTransform(source)
  t.notRegex(
    result,
    /(^|[^.])\beval\s*\(/,
    'no quasi should match SES direct-eval regex'
  )
  const recover = new Function(`${result}\nreturn x;`)
  t.is(recover(), 'eval(foo) and eval(bar)')
})

test('does not touch tagged template literals', (t) => {
  // We deliberately leave tagged templates alone because the tag function
  // is allowed to observe `raw` (and would see different input after the
  // transform). Verify the quasi raw is unchanged.
  const source = 'var x = String.raw`eval()`;'
  const result = applyTransform(source)
  t.true(
    result.includes('`eval()`') || result.includes('`eval()`'),
    'tagged template should be left as-is'
  )
  t.false(
    result.includes('\\u0065val'),
    'tagged template should not be escape-rewritten'
  )
})

test('does not touch templates without an eval pattern', (t) => {
  const source = 'var x = `evaluate this`;'
  const result = applyTransform(source)
  t.true(
    result.includes('`evaluate this`'),
    'template without eval-pattern should be left alone'
  )
})

test('does not touch member-access eval inside templates', (t) => {
  const source = 'var x = `foo.eval(bar)`;'
  const result = applyTransform(source)
  t.true(
    result.includes('`foo.eval(bar)`'),
    'member-access eval is acceptable to SES'
  )
})

test('removes hashbang interpreter directive', (t) => {
  const source = '#!/usr/bin/env node\nconsole.log("hello");'
  const ast = parse(source, {
    sourceType: 'module',
    allowReturnOutsideFunction: true,
    tokens: true,
  })
  t.truthy(ast.program.interpreter, 'hashbang should be parsed initially')

  const pass = createExecVisitor()
  traverseBabel(ast, pass.visitor)

  t.falsy(
    ast.program.interpreter,
    'hashbang interpreter directive should be removed'
  )
})
