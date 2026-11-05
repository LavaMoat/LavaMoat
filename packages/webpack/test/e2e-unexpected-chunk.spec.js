const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const config = makeConfig({
    generatePolicy: false,
    policy: {
      resources: {
        'chunk-loader': {},
        'dynamic-target': {},
      },
    },
  })
  config.entry = { hack: './hack-chunk.js' }
  config.output.chunkFilename = '[id].js'
  config.optimization.chunkIds = 'named'
  config.optimization.minimize = false

  const build = await scaffold(config)
  t.context.bundle = build.snapshot['/dist/hack.js']
  t.is(typeof build.snapshot['/dist/known-chunk.js'], 'string')
})

test('webpack/chunks - prevents loading unexpected chunks', async (t) => {
  const original = await loadUnexpectedChunk(t.context.bundle)
  t.is(
    original.error.message,
    'Attempt to load a chunk that was not known at compile time: unexpected-chunk from chunk-loader'
  )
  t.deepEqual(original.requests, [])
})

test('webpack/chunks - unexpected chunk test has teeth - chunk loads if protections are removed', async (t) => {
  const bundle = t.context.bundle
  const wrapperAssignment = 'policyRequire.e = '
  t.is(
    bundle.split(wrapperAssignment).length,
    2,
    'Expected exactly one chunk loader wrapper to mutate'
  )
  // unwrap the chunk loader to bypass the policy check
  const mutatedBundle = bundle.replace(
    wrapperAssignment,
    'policyRequire.e = __webpack_require__.e; const unused = '
  )
  const mutated = await loadUnexpectedChunk(mutatedBundle)
  t.deepEqual(mutated.requests, ['unexpected-chunk.js'])
  t.is(mutated.error.name, 'ChunkLoadError')
})

/**
 * @param {string} bundle
 * @returns {Promise<{ error: Error; requests: string[] }>}
 */
function loadUnexpectedChunk(bundle) {
  const requests = []
  return new Promise((resolve) => {
    runScriptWithSES(bundle, {
      CHUNK_ID: 'unexpected-chunk',
      TEST_FINISHED: (error) => resolve({ error, requests }),
      setTimeout,
      clearTimeout,
      document: {
        getElementsByTagName: () => [],
        createElement: () => ({
          setAttribute: () => {},
        }),
        head: {
          appendChild: (script) => {
            requests.push(script.src)
            // Report a network failure so webpack settles the load promise.
            script.onerror({ type: 'error', target: script })
          },
        },
      },
    })
  })
}
