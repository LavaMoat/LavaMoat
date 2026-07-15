import test from 'ava'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  applyYamlConfig,
  readYamlArrayField,
  readYamlDocument,
} from '../src/tools/yaml-config.js'

const state = {
  cwd: '',
  filePath: '',
  cacheKey: '',
  initialContent: '',
  initialDoc: /** @type {import('yaml').Document | null} */ (null),
}

test.before(async () => {
  state.cwd = await mkdtemp(join(tmpdir(), 'harden-yaml-config-'))
  state.filePath = join(state.cwd, '.yarnrc.yml')
  state.cacheKey = `${state.filePath}:yaml-config-spec`
  state.initialContent = [
    'plugins:',
    '  - path: ./existing.js',
    'enableScripts: true',
    '',
  ].join('\n')

  await writeFile(state.filePath, state.initialContent)
  state.initialDoc = await readYamlDocument(state.filePath, state.cacheKey)
})

/**
 * @returns {Promise<import('yaml').Document>}
 */
function readCachedDoc() {
  return readYamlDocument(state.filePath, state.cacheKey)
}

/**
 * @param {import('yaml').Document} doc
 * @param {string} fieldName
 * @returns {string | undefined}
 */
function readFieldCommentBefore(doc, fieldName) {
  if (!doc.contents || !('items' in doc.contents)) {
    return undefined
  }

  const items = /** @type {any[]} */ (doc.contents.items)
  const pair = items.find(
    (/** @type {any} */ item) => (item.key?.value ?? item.key) === fieldName
  )
  if (!pair || typeof pair !== 'object' || !('key' in pair)) {
    return undefined
  }
  return /** @type {{ commentBefore?: string }} */ (pair.key).commentBefore
}

test.serial('readYamlDocument returns cached document instance', async (t) => {
  const doc = await readCachedDoc()
  t.is(doc, state.initialDoc)
})

test.serial(
  'readYamlArrayField returns array value from cached document',
  async (t) => {
    const doc = await readCachedDoc()
    t.deepEqual(readYamlArrayField(doc, 'plugins'), [{ path: './existing.js' }])
  }
)

test.serial(
  'readYamlArrayField returns empty array for missing key',
  async (t) => {
    const doc = await readCachedDoc()
    t.deepEqual(readYamlArrayField(doc, 'missingField'), [])
  }
)

test.serial(
  'applyYamlConfig addToExisting appends only missing items in order',
  async (t) => {
    const changed = await applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: 'plugins',
          addToExisting: true,
          value: [{ path: './existing.js' }, { path: './new.js' }],
        },
      ],
      true
    )

    t.deepEqual(changed, [
      {
        file: '.yarnrc.yml',
        key: 'plugins',
        value: [{ path: './existing.js' }, { path: './new.js' }],
      },
    ])

    const doc = await readCachedDoc()
    t.deepEqual(readYamlArrayField(doc, 'plugins'), [
      { path: './existing.js' },
      { path: './new.js' },
    ])
  }
)

test.serial(
  'applyYamlConfig addToExisting is a no-op when all items already present',
  async (t) => {
    const changed = await applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: 'plugins',
          addToExisting: true,
          value: [{ path: './existing.js' }, { path: './new.js' }],
        },
      ],
      true
    )

    t.deepEqual(changed, [])
  }
)

test.serial(
  'applyYamlConfig updates scalar values and no-ops when equal',
  async (t) => {
    const changed = await applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: 'enableScripts',
          value: false,
        },
      ],
      true
    )

    t.deepEqual(changed, [
      {
        file: '.yarnrc.yml',
        key: 'enableScripts',
        value: false,
      },
    ])

    const changedAgain = await applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: 'enableScripts',
          value: false,
        },
      ],
      true
    )

    t.deepEqual(changedAgain, [])

    const doc = await readCachedDoc()
    t.false(doc.get('enableScripts'))
  }
)

test.serial(
  'applyYamlConfig attaches commentBefore to changed key',
  async (t) => {
    const changed = await applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: 'npmMinimalAgeGate',
          value: 4320,
          comment: 'Avoid installing freshly published packages.',
        },
      ],
      true
    )

    t.deepEqual(changed, [
      {
        file: '.yarnrc.yml',
        key: 'npmMinimalAgeGate',
        value: 4320,
      },
    ])

    const doc = await readCachedDoc()
    t.is(
      readFieldCommentBefore(doc, 'npmMinimalAgeGate'),
      ' Avoid installing freshly published packages.'
    )
  }
)

test.serial('applyYamlConfig addToExisting requires string key', async (t) => {
  await t.throwsAsync(
    applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: ['plugins'],
          addToExisting: true,
          value: [{ path: './x.js' }],
        },
      ],
      true
    ),
    {
      message: /addToExisting requires a string key/,
    }
  )
})

test.serial('applyYamlConfig addToExisting requires array value', async (t) => {
  await t.throwsAsync(
    applyYamlConfig(
      state.cwd,
      '.yarnrc.yml',
      [
        {
          target: '.yarnrc.yml',
          key: 'plugins',
          addToExisting: true,
          value: /** @type {any} */ ({ path: './x.js' }),
        },
      ],
      true
    ),
    {
      message: /addToExisting requires an array value/,
    }
  )
})

test.serial(
  'dryRun keeps file content unchanged while cached document mutates',
  async (t) => {
    const fileContent = await readFile(state.filePath, 'utf8')
    t.is(fileContent, state.initialContent)

    const doc = await readCachedDoc()
    t.deepEqual(readYamlArrayField(doc, 'plugins'), [
      { path: './existing.js' },
      { path: './new.js' },
    ])
    t.false(doc.get('enableScripts'))
    t.is(doc.get('npmMinimalAgeGate'), 4320)
  }
)
