const test = /** @type {import('ava').TestFn} */ (require('ava'))
const { scaffold, runScript } = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')
const { VirtualRuntimeModule } = require('../src/runtime/runtimeBuilder.js')

// A key that we know defensive preamble is there to capture.
const GLOBAL_KEY_NAME = 'importScripts'

const testRuntimeModule = new VirtualRuntimeModule({
  name: 'DefensivePreambleTest',
  source: `
    globalThis['${GLOBAL_KEY_NAME}'] = 44;
    if(typeof ${GLOBAL_KEY_NAME} !== 'number' || ${GLOBAL_KEY_NAME} !== 42) {
      throw new Error('"${GLOBAL_KEY_NAME}" is not the expected value: ' + ${GLOBAL_KEY_NAME})
    }
  `,
})

class DefensivePreambleTestPlugin {
  /**
   * @param {import('webpack').Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.compilation.tap(
      'DefensivePreambleTestPlugin',
      (compilation) => {
        compilation.hooks.additionalChunkRuntimeRequirements.tap(
          'DefensivePreambleTestPlugin_runtime',
          (chunk /*, set*/) => {
            if (chunk.hasRuntime()) {
              compilation.addRuntimeModule(chunk, testRuntimeModule)
            }
          }
        )
      }
    )
  }
}

test('webpack/defensive-preamble - captured globals are independent of globalThis and available to all other runtime chunks', async (t) => {
  const config = {
    entry: { app: './simple.js' },
    output: { filename: '[name].js', path: '/dist' },
    // mode: 'development', // uncomment if you peek at the output
    plugins: [
      new LavaMoatPlugin({ generatePolicy: false, policy: { resources: {} } }),
      new DefensivePreambleTestPlugin(),
    ],
  }

  const build = await scaffold(config)
  // t.log(build.snapshot['/dist/app.js']) // peek
  t.notThrows(() => {
    runScript(
      `globalThis['${GLOBAL_KEY_NAME}']=42;` + build.snapshot['/dist/app.js']
    )
  })
})
