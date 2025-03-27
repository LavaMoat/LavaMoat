const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { generateIdentifierLookup } = require('../src/buildtime/aa')

test('aa - generateIdentifierLookup', (t) => {
  const lookupTools = generateIdentifierLookup({
    paths: [
      '/app.js',
      '/node_modules/leftpad/index.js',
      '/node_modules/fast-json-patch/index.mjs',
      '/node_modules/@ethereumjs/util/dist/index.js',
      '/node_modules/@ethereumjs/util/node_modules/ethereum-cryptography/dist/index.js',
      '/node_modules/fast-json-patch/module/duplex.mjs',
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
        '/node_modules/leftpad/': 'leftpad',
        '/node_modules/fast-json-patch': 'fast-json-patch',
        '/node_modules/fast-json-patch/module': 'fast-json-patch',
        '/node_modules/@ethereumjs/util/dist/': '@ethereumjs/util',
        '/node_modules/@ethereumjs/util/node_modules/ethereum-cryptography/dist/':
          '@ethereumjs/util>ethereum-cryptography',
      })
    ),
    unenforceableModuleIds: [],
    readableResourceIds: true,
    contextModules: [],
  })

  const translatedPolicy = lookupTools.getTranslatedPolicy()

  // TODO: modify the input and assert that filtering works in policy translation
  t.is(Object.keys(translatedPolicy.resources).length, 9)
  // TODO: assert on packages translations
})
