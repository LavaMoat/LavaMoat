const browserify = require('browserify')

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(global.process.env.PERF_N || 5, 10)

Promise.all(Array(nTimes).fill().forEach(async (_, index) => {
  const bundler = browserify('./bundle-entry.js')
  await new Promise(resolve => {
    bundler.bundle().on('end', resolve)
  })
}))
