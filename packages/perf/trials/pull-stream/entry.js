const pull = require('pull-stream')

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(globalThis.process.env.PERF_N || 5, 10)

new Promise((resolve) => {
  const inputValues = Array(nTimes)
    .fill()
    .map((_, index) => `input-value-${index}`)
  pull(
    pull.values(inputValues),
    pull.asyncMap((value, cb) => {
      const result = `ding: ${value}`
      cb(null, result)
    }),
    pull.collect(function (err, array) {
      resolve(array)
    })
  )
})
