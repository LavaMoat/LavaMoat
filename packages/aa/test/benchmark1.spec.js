const { realpathSync, lstatSync } = require('node:fs')
const path = require('node:path')
const test = require('ava')
const { createProject4Symlink } = require('./utils')

function isSymlink(location) {
  const info = lstatSync(location)
  return info.isSymbolicLink()
}

const symlink = path.normalize(
  path.join(__dirname, './projects/4/node_modules/aaa')
)
const notsymlink = path.normalize(
  path.join(__dirname, './projects/4/node_modules/bbb')
)

const bench = (fn, name) => {
  const t0 = performance.now()
  for (let i = 0; i < 10000; i++) {
    fn()
  }
  const t1 = performance.now()
  return [name, t1 - t0]
}

const ratioIsBelow = (a, b, expected) => {
  const ratio = a / b
  return ratio < expected
}

test('[bench] isSymlink is significantly faster than realpathSync in a naive microbenchmark', async (t) => {
  await createProject4Symlink()
  const entries = [
    bench(() => {
      isSymlink(symlink)
    }, 'isSymlink(symlink)'),
    bench(() => {
      isSymlink(notsymlink)
    }, 'isSymlink(notsymlink)'),
    bench(() => {
      realpathSync(symlink)
    }, 'realpathSync(symlink)'),
    bench(() => {
      realpathSync(notsymlink)
    }, 'realpathSync(notsymlink)'),
  ]

  const results = Object.fromEntries(entries)
  t.log({ results })
  t.assert(
    ratioIsBelow(
      results['isSymlink(symlink)'],
      results['realpathSync(symlink)'],
      0.2 // the tradeoff is worth it up until close to 1, so this number can be increased.
    ),
    'expected isSymlink(symlink) to be much faster than realpathSync(symlink)'
  )
  t.assert(
    ratioIsBelow(
      results['isSymlink(notsymlink)'],
      results['realpathSync(notsymlink)'],
      0.2 // the tradeoff is worth it up until close to 1, so this number can be increased.
    ),
    'expected isSymlink(notsymlink) to be much faster than realpathSync(notsymlink)'
  )
})
