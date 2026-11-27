const { default: test } = /** @type {typeof import('ava')} */ (require('ava'))
const { scaffold } = require('./scaffold.js')
const { makeConfig } = require('./fixtures/main/webpack.config.js')

test.before(async (t) => {
  const webpackConfig = makeConfig()
  // use webpack's built-in html support instead of html-webpack-plugin
  webpackConfig.plugins = webpackConfig.plugins.filter(
    (p) => p.constructor.name !== 'HtmlWebpackPlugin'
  )
  webpackConfig.entry = { app: './native.html' }
  webpackConfig.experiments = { html: true }
  await t.notThrowsAsync(async () => {
    t.context.build = await scaffold(webpackConfig)
  }, 'Expected the build to succeed')
})

test('webpack/native-html - lockdown script is the first script in head', (t) => {
  if (!t.context.build.snapshot['/dist/native.html']) {
    t.fail('expected native.html in dist dir of the build snapshot')
    return
  }
  const html = t.context.build.snapshot['/dist/native.html']
  const lockdown = html.indexOf('<script src="./lockdown">')
  t.true(lockdown > -1, 'expected lockdown script tag')
  t.true(
    lockdown < html.indexOf('main.js') || !html.includes('main.js'),
    'lockdown should be before main.js if it exists'
  )
  t.true(lockdown < html.indexOf('</head>'), 'lockdown should be in head')
})
