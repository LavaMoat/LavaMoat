const { asyncSeriesRepeat } = require('../../util.js')
const browserify = require('browserify')

// use globalThis.process to avoid hardcoding value when bundling
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

asyncSeriesRepeat(nTimes, async () => {
  const bundler = browserify('./bundle-entry.js')
  await new Promise((resolve, reject) => {
    bundler.bundle((err, _bundle) => {
      if (err) {
        return reject(err)
      }
      resolve()
    })
  })
})