import test from 'ava'
import path from 'node:path'
import {
  cacheDirFor,
  computeCacheBase,
  parseSpec,
  slugifySpec,
  unscopedName,
} from '../../src/spec.js'
import { SpecParseError } from '../../src/error.js'

test('parseSpec - bare name', (t) => {
  t.deepEqual(parseSpec('cowsay'), {
    name: 'cowsay',
    version: undefined,
    raw: 'cowsay',
  })
})

test('parseSpec - name with version', (t) => {
  t.deepEqual(parseSpec('cowsay@1.5.0'), {
    name: 'cowsay',
    version: '1.5.0',
    raw: 'cowsay@1.5.0',
  })
})

test('parseSpec - name with dist-tag', (t) => {
  t.deepEqual(parseSpec('cowsay@latest'), {
    name: 'cowsay',
    version: 'latest',
    raw: 'cowsay@latest',
  })
})

test('parseSpec - scoped name', (t) => {
  t.deepEqual(parseSpec('@lavamoat/node'), {
    name: '@lavamoat/node',
    version: undefined,
    raw: '@lavamoat/node',
  })
})

test('parseSpec - scoped name with version', (t) => {
  t.deepEqual(parseSpec('@lavamoat/node@1.0.6'), {
    name: '@lavamoat/node',
    version: '1.0.6',
    raw: '@lavamoat/node@1.0.6',
  })
})

test('parseSpec - scoped name with range', (t) => {
  t.deepEqual(parseSpec('@scope/pkg@^2.0.0'), {
    name: '@scope/pkg',
    version: '^2.0.0',
    raw: '@scope/pkg@^2.0.0',
  })
})

test('parseSpec - trims whitespace', (t) => {
  t.deepEqual(parseSpec('  cowsay@1  '), {
    name: 'cowsay',
    version: '1',
    raw: 'cowsay@1',
  })
})

test('parseSpec - non-registry tarball URL has undefined name', (t) => {
  const url = 'https://example.com/pkg.tgz'
  t.deepEqual(parseSpec(url), { name: undefined, version: undefined, raw: url })
})

test('parseSpec - git specifier has undefined name', (t) => {
  const spec = 'git+https://github.com/user/repo.git'
  t.is(parseSpec(spec).name, undefined)
})

test('parseSpec - github shorthand has undefined name', (t) => {
  t.is(parseSpec('user/repo').name, undefined)
})

test('parseSpec - local path has undefined name', (t) => {
  t.is(parseSpec('./local-pkg').name, undefined)
})

test('parseSpec - throws on empty', (t) => {
  t.throws(() => parseSpec('   '), { instanceOf: SpecParseError })
})

test('parseSpec - throws on non-string', (t) => {
  // @ts-expect-error testing bad input
  t.throws(() => parseSpec(42), { instanceOf: SpecParseError })
})

test('unscopedName - unscoped', (t) => {
  t.is(unscopedName('cowsay'), 'cowsay')
})

test('unscopedName - scoped', (t) => {
  t.is(unscopedName('@lavamoat/node'), 'node')
})

test('slugifySpec - sanitizes unsafe characters', (t) => {
  t.is(slugifySpec('@scope/pkg@^2.0.0'), 'scope-pkg-2.0.0')
})

test('slugifySpec - never empty', (t) => {
  t.is(slugifySpec('///'), 'pkg')
})

test('computeCacheBase - explicit cacheDir wins', (t) => {
  t.is(computeCacheBase({ cacheDir: '/tmp/foo' }), path.resolve('/tmp/foo'))
})

test('computeCacheBase - falls back to env var', (t) => {
  t.is(
    computeCacheBase({ env: { LAVAMOAT_RUN_CACHE: '/tmp/bar' } }),
    path.resolve('/tmp/bar')
  )
})

test('computeCacheBase - default uses homedir', (t) => {
  t.is(
    computeCacheBase({ env: {}, homedir: () => '/home/tester' }),
    path.join('/home/tester', '.lavamoat', 'run')
  )
})

test('cacheDirFor - deterministic and under base', (t) => {
  const a = cacheDirFor('cowsay@1.5.0', '/base')
  const b = cacheDirFor('cowsay@1.5.0', '/base')
  t.is(a, b)
  t.is(path.dirname(a), '/base')
})

test('cacheDirFor - distinct specs differ', (t) => {
  t.not(cacheDirFor('cowsay@1', '/base'), cacheDirFor('cowsay@2', '/base'))
})
