const webpack = require('webpack')
const config = require('./webpack.config.js')
const path = require('node:path')

// Ensure the output directory exists
const outputDir = path.resolve(__dirname, 'dist')

// Run webpack compilation
webpack(config, (err, stats) => {
  if (err) {
    console.error('Webpack configuration error:', err)
    process.exit(1)
  }

  const info = stats.toJson()

  if (stats.hasErrors()) {
    console.error('Webpack build errors:', info.errors[0].message)
    process.exit(1)
  }

  if (stats.hasWarnings()) {
    console.warn('Webpack build warnings:', info.warnings[0].message)
  }

  console.log(stats.toString({ chunks: false, colors: true }))

  console.log('Build complete! Output in', outputDir)
})
