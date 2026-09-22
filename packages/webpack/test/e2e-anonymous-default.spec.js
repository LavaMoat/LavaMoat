const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { scaffold, runScriptWithSES } = require('./scaffold.js')
const LavaMoatPlugin = require('../src/plugin.js')

// webpack >=5.107 adds the `setAnonymousDefaultName` runtime global
// (`__webpack_require__.dn`) and calls it from any module that has an anonymous
// default export. Wrapped modules see LavaMoat's `policyRequire` rather than
// the real `__webpack_require__`, so `dn` has to be passed through explicitly
// or the module throws "__webpack_require__.dn is not a function" at runtime.
test('webpack/anonymous-default - anonymous default exports get their name set', async (t) => {
  const config = {
    entry: { app: './anonymous-default.js' },
    output: { filename: '[name].js', path: '/dist' },
    plugins: [
      new LavaMoatPlugin({ generatePolicy: false, policy: { resources: {} } }),
    ],
  }

  const build = await scaffold(config)

  /** @type {{ name: string; result: string } | undefined} */
  let reported
  t.notThrows(() => {
    runScriptWithSES(build.snapshot['/dist/app.js'], {
      report: (/** @type {typeof reported} */ value) => {
        reported = value
      },
    })
  }, 'Expected the bundle to run without throwing')

  t.is(reported?.result, 'called', 'Expected the default export to be callable')
  t.is(reported?.name, 'default', 'Expected .name to be set to "default"')
})
