import test from 'ava'
import { codeSampleFromAstNode } from '../src/code-sample-from-ast-node.ts'
import type { NodeWithLocation } from 'lavamoat-tofu'

/**
 * Build a minimal NodeWithLocation fixture for testing.
 */
function makeNode(
  startLine: number,
  startColumn: number,
  endLine?: number,
  endColumn?: number
): NodeWithLocation {
  return {
    type: 'Identifier',
    loc: {
      start: { line: startLine, column: startColumn },
      end: endLine != null && endColumn != null
        ? { line: endLine, column: endColumn }
        : undefined,
      filename: undefined,
      identifierName: undefined,
    },
    start: 0,
    end: 10,
    innerComments: undefined,
    leadingComments: undefined,
    trailingComments: undefined,
    extra: undefined,
  } as unknown as NodeWithLocation
}

const content = 'const x = 1;\nconst y = process.env.FOO;\nconst z = 3;'

test('codeSampleFromAstNode - range without end', (t) => {
  const node = makeNode(1, 6)
  const result = codeSampleFromAstNode(node, { content })
  t.is(result.range, '1:6')
})

test('codeSampleFromAstNode - range with end', (t) => {
  const node = makeNode(2, 10, 2, 21)
  const result = codeSampleFromAstNode(node, { content })
  t.is(result.range, '2:10,2:21')
})

test('codeSampleFromAstNode - sample is taken from start column', (t) => {
  const node = makeNode(2, 10)
  const result = codeSampleFromAstNode(node, { content })
  // "const y = process.env.FOO;" starting at col 10
  t.is(result.sample, 'process.env.FOO;')
})

test('codeSampleFromAstNode - sample is capped at 70 chars', (t) => {
  const longContent = 'const foo = ' + 'a'.repeat(100) + ';'
  const node = makeNode(1, 12)
  const result = codeSampleFromAstNode(node, { content: longContent })
  t.true(result.sample.length <= 70)
})
