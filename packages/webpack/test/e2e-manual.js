const { scaffold, runScriptWithSES } = require('./scaffold.js')
const webpackConfigDefault = require('./fixtures/main/webpack.config.js')
const webpackConfig = {
  ...webpackConfigDefault,
  mode: 'development',
  devtool: false,
}

const fs = require('fs')

scaffold(webpackConfig).then(({ stdout, snapshot }) => {
  console.log(stdout)
  fs.mkdirSync('./tmp', { recursive: true })
  const now = new Date()
  fs.writeFileSync(
    `./tmp/bundle_${now.toISOString()}.js`,
    '/* eslint-disable */\n' + snapshot['/dist/app.js']
  )
  runScriptWithSES(snapshot['/dist/app.js'])
})
