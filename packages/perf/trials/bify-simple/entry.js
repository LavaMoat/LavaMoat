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

async function asyncSeries(tasks) {
  const results = [];
  for (const task of tasks) {
    results.push(await task());
  }
  return results;
}

async function asyncSeriesRepeat (n, task) {
  const tasks = Array(n).fill(task);
  return await asyncSeries(tasks);
}