const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { generateIdentifierLookup } = require('../src/buildtime/aa')

const lookupFixture = {
  paths: [
    { moduleId: 1110, path: '/app.js' },
    { moduleId: 1111, path: '/node_modules/leftpad/index.js' },
    { moduleId: 1112, path: '/node_modules/fast-json-patch/index.mjs' },
    { moduleId: 1113, path: '/node_modules/@ethereumjs/util/dist/index.js' },
    {
      moduleId: 1114,
      path: '/node_modules/@ethereumjs/util/node_modules/ethereum-cryptography/dist/index.js',
    },
    { moduleId: 1115, path: '/node_modules/fast-json-patch/module/duplex.mjs' },
  ],
  policy: {
    resources: {
      '@ethereumjs/util': {
        globals: 1,
        packages: {
          '@ethereumjs/util>@chainsafe/ssz': true,
          '@ethereumjs/util>@ethereumjs/rlp': true,
          '@ethereumjs/util>ethereum-cryptography': true,
        },
      },
      '@ethereumjs/util>@chainsafe/ssz': {
        globals: 2,
        packages: {
          '@ethereumjs/util>@chainsafe/ssz>@chainsafe/as-sha256': true,
          '@ethereumjs/util>@chainsafe/ssz>@chainsafe/persistent-merkle-tree': true,
          '@ethereumjs/util>@chainsafe/ssz>case': true,
        },
      },
      '@ethereumjs/util>@chainsafe/ssz>@chainsafe/as-sha256': {
        globals: 3,
      },
      '@ethereumjs/util>@chainsafe/ssz>@chainsafe/persistent-merkle-tree': {
        globals: 4,
        packages: {
          '@ethereumjs/util>@chainsafe/ssz>@chainsafe/as-sha256': true,
        },
      },
      '@ethereumjs/util>@ethereumjs/rlp': {
        globals: 5,
      },
      '@ethereumjs/util>ethereum-cryptography': {
        globals: 6,
        packages: {
          '@ethereumjs/util>ethereum-cryptography>@noble/hashes': true,
          '@ethereumjs/util>ethereum-cryptography>@noble/secp256k1': true,
        },
      },
      '@ethereumjs/util>ethereum-cryptography>@noble/hashes': {
        globals: 7,
      },
      '@ethereumjs/util>ethereum-cryptography>@noble/secp256k1': {
        globals: 8,
      },
      'fast-json-patch': {
        globals: 9,
      },
    },
  },
  canonicalNameMap: new Map(
    Object.entries({
      '/': '$root$',
      '/node_modules/leftpad': 'leftpad',
      '/node_modules/fast-json-patch': 'fast-json-patch',
      '/node_modules/fast-json-patch/module': 'fast-json-patch',
      '/node_modules/@ethereumjs/util/dist': '@ethereumjs/util',
      '/node_modules/@ethereumjs/util/node_modules/ethereum-cryptography/dist':
        '@ethereumjs/util>ethereum-cryptography',
    })
  ),

  contextModules: [],
}

test('aa - generateIdentifierLookup narrows the policy without translation', (t) => {
  const lookupTools = generateIdentifierLookup({
    ...lookupFixture,
    readableResourceIds: true,
  })

  const translatedPolicy = lookupTools.getTranslatedPolicy()

  t.is(Object.keys(translatedPolicy.resources).length, 3)
  t.snapshot(translatedPolicy.resources)
})

test('aa - generateIdentifierLookup translates and narrows the policy', (t) => {
  const lookupTools = generateIdentifierLookup({
    ...lookupFixture,
    readableResourceIds: false,
  })

  const translatedPolicy = lookupTools.getTranslatedPolicy()

  t.is(Object.keys(translatedPolicy.resources).length, 3)
  t.snapshot(translatedPolicy.resources)
})

test('aa - identifiersForModuleIds is sorted', (t) => {
  const { identifiersForModuleIds } = generateIdentifierLookup({
    ...lookupFixture,
    readableResourceIds: true,
  })

  // Entries must be sorted by resource key.
  const keys = identifiersForModuleIds.map(([key]) => key)
  t.deepEqual(
    keys,
    [...keys].sort((a, b) =>
      String(a).localeCompare(String(b), 'en', { numeric: true })
    )
  )

  // Module ids within each entry must be sorted.
  for (const [, moduleIds] of identifiersForModuleIds) {
    t.deepEqual(
      moduleIds,
      [...moduleIds].sort((a, b) =>
        String(a).localeCompare(String(b), 'en', { numeric: true })
      )
    )
  }
})

test('aa - identifiersForModuleIds is independent of input order', (t) => {
  const ordered = generateIdentifierLookup({
    ...lookupFixture,
    readableResourceIds: true,
  }).identifiersForModuleIds

  // Reversing the order of the input paths must not change the output. The
  // real plugin collects these by iterating webpack's `compilation.chunks`
  // Set, whose order is not stable between builds; the lookup must normalize
  // it so the emitted runtime is reproducible.
  const shuffled = generateIdentifierLookup({
    ...lookupFixture,
    paths: [...lookupFixture.paths].reverse(),
    readableResourceIds: true,
  }).identifiersForModuleIds

  t.deepEqual(shuffled, ordered)
})
