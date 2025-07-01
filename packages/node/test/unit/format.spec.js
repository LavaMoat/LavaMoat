import test from 'ava'
import path from 'node:path'
import { hrPath, stripAnsi } from '../../src/format.js'

test('hrPath - returns relative path if shorter than absolute path', (t) => {
  t.plan(3)
  const absPath = path.resolve('test/path')
  const relativePath = path.relative(process.cwd(), absPath)
  const hrRelativePath = hrPath(relativePath)
  const strippedHrRelativePath = stripAnsi(hrRelativePath)
  t.not(
    strippedHrRelativePath,
    hrRelativePath,
    'hrPath should return a colored string'
  )
  t.true(
    strippedHrRelativePath.startsWith(`.${path.sep}`),
    'Relative paths returned by hrPath should start with a dot and path separator'
  )
  const normalizedStrippedHrRelativePath = path.normalize(
    strippedHrRelativePath
  )
  t.is(
    normalizedStrippedHrRelativePath,
    relativePath,
    'Human-readable relative path should match the original relative path'
  )
})

test('hrPath - returns absolute path if shorter than relative path', (t) => {
  let relativePath = 'test/path'
  const cwd = process.cwd()
  while (relativePath.length < cwd.length) {
    relativePath = path.join('..', relativePath)
  }
  const absPath = path.resolve(cwd, relativePath)
  t.is(
    stripAnsi(hrPath(relativePath)),
    absPath,
    `${absPath} should be a shorter string than ${relativePath}`
  )
})
