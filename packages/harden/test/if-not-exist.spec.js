import test from 'ava'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { applyNpmrc } from '../src/tools/npmrc.js'
import { applyYamlConfig } from '../src/tools/yaml-config.js'
import { verifyOpinion } from '../src/tools/apply-change.js'
import { opinions as pnpmOpinions } from '../src/pnpm/opinions.js'
import { opinions as yarnOpinions } from '../src/yarn/opinions.js'
import { opinions as npmOpinions } from '../src/npm/opinions.js'

/** @import {Change} from '../src/tools/types.js' */

/**
 * @param {string} prefix
 * @param {string} filename
 * @param {string} content
 */
async function setup(prefix, filename, content) {
  const cwd = await mkdtemp(join(tmpdir(), `harden-ifnotexist-${prefix}-`))
  const filePath = join(cwd, filename)
  await writeFile(filePath, content)
  return { cwd, filePath }
}

/** @type {Change} */
const yamlAgeChange = {
  target: 'pnpm-workspace.yaml',
  key: 'minimumReleaseAge',
  value: 4320,
  comment: 'harden comment',
  ifNotExist: true,
}

/** @type {Change} */
const npmrcAgeChange = {
  target: '.npmrc',
  key: 'min-release-age',
  value: '3',
  comment: 'harden comment',
  ifNotExist: true,
}

// --- yaml ---

test('yaml: ifNotExist keeps existing value and user comment', async (t) => {
  const content = '# my comment\nminimumReleaseAge: 1440\n'
  const { cwd, filePath } = await setup(
    'yaml-keep',
    'pnpm-workspace.yaml',
    content
  )

  const changed = await applyYamlConfig(cwd, 'pnpm-workspace.yaml', [
    yamlAgeChange,
  ])

  t.deepEqual(changed, [])
  t.is(await readFile(filePath, 'utf8'), content)
})

test('yaml: ifNotExist keeps an explicit 0', async (t) => {
  const content = 'minimumReleaseAge: 0\n'
  const { cwd, filePath } = await setup(
    'yaml-zero',
    'pnpm-workspace.yaml',
    content
  )

  const changed = await applyYamlConfig(cwd, 'pnpm-workspace.yaml', [
    yamlAgeChange,
  ])

  t.deepEqual(changed, [])
  t.is(await readFile(filePath, 'utf8'), content)
})

test('yaml: ifNotExist adds absent key with comment', async (t) => {
  const { cwd, filePath } = await setup(
    'yaml-absent',
    'pnpm-workspace.yaml',
    'other: true\n'
  )

  const changed = await applyYamlConfig(cwd, 'pnpm-workspace.yaml', [
    yamlAgeChange,
  ])

  t.deepEqual(changed, [
    { file: 'pnpm-workspace.yaml', key: 'minimumReleaseAge', value: 4320 },
  ])
  const written = await readFile(filePath, 'utf8')
  t.regex(written, /# harden comment\nminimumReleaseAge: 4320/)
})

for (const empty of [
  'minimumReleaseAge:\n',
  'minimumReleaseAge: ~\n',
  "minimumReleaseAge: ''\n",
]) {
  test(`yaml: ifNotExist treats ${JSON.stringify(empty)} as absent`, async (t) => {
    const { cwd, filePath } = await setup(
      'yaml-empty',
      'pnpm-workspace.yaml',
      empty
    )

    const changed = await applyYamlConfig(cwd, 'pnpm-workspace.yaml', [
      yamlAgeChange,
    ])

    t.is(changed.length, 1)
    t.regex(await readFile(filePath, 'utf8'), /minimumReleaseAge: 4320/)
  })
}

test('yaml: without ifNotExist existing value is still overwritten', async (t) => {
  const { cwd, filePath } = await setup(
    'yaml-enforce',
    'pnpm-workspace.yaml',
    'minimumReleaseAge: 1440\n'
  )

  const changed = await applyYamlConfig(cwd, 'pnpm-workspace.yaml', [
    { ...yamlAgeChange, ifNotExist: false },
  ])

  t.is(changed.length, 1)
  t.regex(await readFile(filePath, 'utf8'), /minimumReleaseAge: 4320/)
})

// --- npmrc ---

test('npmrc: ifNotExist keeps existing active value and comment', async (t) => {
  const content = '## my comment\nmin-release-age=1\n'
  const { cwd, filePath } = await setup('npmrc-keep', '.npmrc', content)

  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange], true), [])
  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange]), [])
  t.is(await readFile(filePath, 'utf8'), content)
})

test('npmrc: ifNotExist keeps existing active value and the setting before it', async (t) => {
  const content = 'foo=bar\nmin-release-age=1\n'
  const { cwd, filePath } = await setup('npmrc-keep-setting', '.npmrc', content)

  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange], true), [])
  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange]), [])
  t.is(await readFile(filePath, 'utf8'), content)
})

test('npmrc: ifNotExist replaces a ;-commented line', async (t) => {
  const { cwd, filePath } = await setup(
    'npmrc-semi',
    '.npmrc',
    ';min-release-age=1\n'
  )

  const expected = [{ file: '.npmrc', key: 'min-release-age', value: '3' }]
  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange], true), expected)
  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange]), expected)

  const written = await readFile(filePath, 'utf8')
  t.regex(written, /^min-release-age=3$/m)
  t.notRegex(written, /;min-release-age/)
})

test('npmrc: ifNotExist treats an empty value as absent', async (t) => {
  const { cwd, filePath } = await setup('npmrc-empty', '.npmrc', 'min-release-age=\n')

  const changed = await applyNpmrc(cwd, [npmrcAgeChange])

  t.deepEqual(changed, [{ file: '.npmrc', key: 'min-release-age', value: '3' }])
  const written = await readFile(filePath, 'utf8')
  t.regex(written, /^min-release-age=3$/m)
  t.notRegex(written, /^min-release-age=$/m)
})

test('npmrc: ifNotExist keeps active value after a ;-commented one', async (t) => {
  const content = ';min-release-age=1\nmin-release-age=7\n'
  const { cwd, filePath } = await setup('npmrc-both', '.npmrc', content)

  t.deepEqual(await applyNpmrc(cwd, [npmrcAgeChange]), [])
  t.is(await readFile(filePath, 'utf8'), content)
})

test('npmrc: ifNotExist treats a #-commented line as absent', async (t) => {
  const { cwd, filePath } = await setup(
    'npmrc-hash',
    '.npmrc',
    '# min-release-age=1\n'
  )

  const changed = await applyNpmrc(cwd, [npmrcAgeChange])

  t.deepEqual(changed, [{ file: '.npmrc', key: 'min-release-age', value: '3' }])
  const written = await readFile(filePath, 'utf8')
  t.regex(written, /^# min-release-age=1$/m)
  t.regex(written, /^min-release-age=3$/m)
})

test('npmrc: ifNotExist adds absent key', async (t) => {
  const { cwd, filePath } = await setup(
    'npmrc-absent',
    '.npmrc',
    'other=true\n'
  )

  const changed = await applyNpmrc(cwd, [npmrcAgeChange])

  t.deepEqual(changed, [{ file: '.npmrc', key: 'min-release-age', value: '3' }])
  const written = await readFile(filePath, 'utf8')
  t.regex(written, /^other=true$/m)
  t.regex(written, /^## harden comment\nmin-release-age=3$/m)
})

test('npmrc: without ifNotExist existing value is still replaced', async (t) => {
  const { cwd, filePath } = await setup(
    'npmrc-enforce',
    '.npmrc',
    'min-release-age=1\n'
  )

  const changed = await applyNpmrc(cwd, [
    { ...npmrcAgeChange, ifNotExist: false },
  ])

  t.is(changed.length, 1)
  t.regex(await readFile(filePath, 'utf8'), /^min-release-age=3$/m)
})

// --- opinions ---

/**
 * @param {readonly import('../src/tools/types.js').Opinion[]} list
 * @param {string} id
 */
function findOpinion(list, id) {
  const opinion = list.find((o) => o.id === id)
  if (!opinion || opinion.alternatives) {
    throw new Error(`opinion ${id} not found`)
  }
  return opinion
}

const ageCases = [
  {
    id: 'p_age',
    list: pnpmOpinions,
    filename: 'pnpm-workspace.yaml',
    content: 'minimumReleaseAge: 1440\n',
  },
  {
    id: 'y_age',
    list: yarnOpinions,
    filename: '.yarnrc.yml',
    content: 'npmMinimalAgeGate: 1440\n',
  },
  {
    id: 'n_age',
    list: npmOpinions,
    filename: '.npmrc',
    content: 'min-release-age=1\n',
  },
]

for (const { id, list, filename, content } of ageCases) {
  test(`${id}: existing age value counts as applied`, async (t) => {
    const { cwd } = await setup(id, filename, content)
    const opinion = findOpinion(list, id)

    t.is(await verifyOpinion(cwd, opinion, /** @type {any} */ ({ cwd })), 1)
  })
}

test('p_no_downgrade: existing trustPolicy value is still enforced', async (t) => {
  const { cwd } = await setup(
    'trust',
    'pnpm-workspace.yaml',
    'trustPolicy: off\n'
  )
  const opinion = findOpinion(pnpmOpinions, 'p_no_downgrade')

  t.is(await verifyOpinion(cwd, opinion, /** @type {any} */ ({ cwd })), 0)
})
