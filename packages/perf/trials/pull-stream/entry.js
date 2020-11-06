const pull = require('pull-stream')

// use `global.process` so it works correctly under node
const nTimes = Number.parseInt(global.process.env.PERF_N || 5, 10)

Promise.all(Array(nTimes).fill().map(async (_, index) => {
  await new Promise(resolve => {
    const inputValues = Array(100).fill().map((_, index) => `input-value-${index}`)
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
}))
