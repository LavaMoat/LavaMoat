const { realpathSync, lstatSync } = require('node:fs')
const path = require('node:path')
const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { createProject4Symlink } = require('./utils')
const { simpleBench } = require('./bench')

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

const ratioIsBelow = (a, b, expected) => {
  const ratio = a / b
  return ratio < expected
}

// FIXME: this test fails on darwin running in GH actions; diagnose and fix
if (process.platform === 'darwin' && process.env.CI) {
  test.todo(
    '[bench] isSymlink is significantly faster than realpathSync in a naive microbenchmark [darwin]'
  )
} else {
  test('[bench] isSymlink is significantly faster than realpathSync in a naive microbenchmark', async (t) => {
    await createProject4Symlink()
    const results = {
      ...simpleBench(() => {
        isSymlink(symlink)
      }, 'isSymlink(symlink)').current,
      ...simpleBench(() => {
        isSymlink(notsymlink)
      }, 'isSymlink(notsymlink)').current,
      ...simpleBench(() => {
        realpathSync(symlink)
      }, 'realpathSync(symlink)').current,
      ...simpleBench(() => {
        realpathSync(notsymlink)
      }, 'realpathSync(notsymlink)').current,
    }

    t.log({ results })
    t.assert(
      ratioIsBelow(
        results['isSymlink(symlink)'],
        results['realpathSync(symlink)'],
        0.5 // the tradeoff is worth it up until close to 1, so this number can be increased.
        // The ratio is under 0.2 on linux and windows, slihtly above that on mac in GH actions
        // Setting to 0.5 to avoid flakiness
      ),
      'expected isSymlink(symlink) to be much faster than realpathSync(symlink)'
    )
    t.assert(
      ratioIsBelow(
        results['isSymlink(notsymlink)'],
        results['realpathSync(notsymlink)'],
        0.5 // the tradeoff is worth it up until close to 1, so this number can be increased.
        // The ratio is under 0.2 on linux and windows, slihtly above that on mac in GH actions
        // Setting to 0.5 to avoid flakiness
      ),
      'expected isSymlink(notsymlink) to be much faster than realpathSync(notsymlink)'
    )
  })
}
