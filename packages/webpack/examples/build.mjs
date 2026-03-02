// @ts-check
'use strict'

import webpack from 'webpack'
import config from './webpack.config.js'

webpack(config, (err, stats) => {
  if (err) {
    console.error(err.stack || err)
    if (err.details) {
      console.error(err.details)
    }
    process.exit(1)
  }

  const info = stats.toJson()

  if (stats.hasErrors()) {
    console.error(info.errors)
    process.exit(1)
  }

  if (stats.hasWarnings()) {
    console.warn(info.warnings)
  }

  console.log(
    stats.toString({
      colors: true,
    })
  )
})
