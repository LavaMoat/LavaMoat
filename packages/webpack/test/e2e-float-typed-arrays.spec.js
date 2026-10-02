const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')

test('webpack/float-typed-arrays - policy can grant float typed arrays', async (t) => {
  const config = {
    entry: { app: './float-typed-arrays.js' },
    output: { filename: '[name].js', path: '/dist' },
    plugins: [
      new LavaMoatPlugin({
        generatePolicy: false,
        policy: {
          resources: {
            'float-typed-array-package': {
              globals: { Float32Array: true, Float64Array: true },
            },
          },
        },
      }),
    ],
  }

  const build = await scaffold(config)

  /** @type {{ f64: number; f32: number } | undefined} */
  let reported
  t.notThrows(() => {
    runScriptWithSES(build.snapshot['/dist/app.js'], {
      report: (/** @type {typeof reported} */ value) => {
        reported = value
      },
    })
  }, 'Expected the bundle to run without throwing')

  t.is(reported?.f64, 2, 'Expected Float64Array to be constructable')
  t.is(reported?.f32, 3, 'Expected Float32Array to be constructable')
})
