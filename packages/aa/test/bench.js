const translateHeapStats = (stats = []) => {
  const result = {}
  for (const { space_name, space_used_size } of stats) {
    result[space_name] = space_used_size
  }
  return result
}

const updateMaxEachKey = (current, update) => {
  for (const key in current) {
    current[key] = Math.max(current[key], update[key])
  }
}

const diffEachKey = (a, b) => {
  const result = {}
  for (const key in a) {
    result[key] = b[key] - a[key]
  }
  return result
}

const toHumanReadable = (obj) => {
  const result = {}
  for (const key in obj) {
    if (obj[key] > 0) result[key] = `+${(obj[key] / 1024 / 1024).toFixed(4)} MB`
  }
  return result
}

const recordMemorySpike = (frequency = 10) => {
  const v8 = require('node:v8')
  const initial = translateHeapStats(v8.getHeapSpaceStatistics())
  const result = { ...initial }
  const collect = () =>
    updateMaxEachKey(result, translateHeapStats(v8.getHeapSpaceStatistics()))
  const interval = setInterval(collect, frequency)
  return {
    collect,
    getResult: () => {
      clearInterval(interval)
      collect()
      return toHumanReadable(diffEachKey(initial, result))
    },
  }
}

const history = (name, value) => {
  const fs = require('node:fs')
  const { execSync } = require('node:child_process')
  const filePath = `.bench-${name}.log` // the intention is for the file to be gitignored and only referred locally
  let log = {}
  if (fs.existsSync(filePath)) {
    log = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  }
  const summary = {
    current: value,
    ...log,
  }
  const commit =
    'git:' + execSync('git rev-parse --short HEAD').toString().trim()
  log[commit] = value
  fs.writeFileSync(filePath, JSON.stringify(log, null, 2))

  return summary
}

/**
 * Benchmarks a synchronous function.
 *
 * @param {Function} fn - The synchronous function to be benchmarked.
 * @param {string} name - The name of the benchmark.
 * @param {number} [iterations=1000] - The number of iterations to run the
 *   benchmark. Default is `1000`
 * @returns {Object} - The benchmark result, including the average time per
 *   iteration and memory spike.
 */
exports.simpleBench = (fn, name, iterations = 1000) => {
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const t1 = performance.now()
  return {
    current: {
      [name]: (t1 - t0) / iterations,
    },
  }
}
/**
 * Benchmarks a synchronous function.
 *
 * @param {Function} fn - The synchronous function to be benchmarked.
 * @param {string} name - The name of the benchmark.
 * @param {number} [iterations=1000] - The number of iterations to run the
 *   benchmark. Default is `1000`
 * @returns {Object} - The benchmark result, including the average time per
 *   iteration and memory spike.
 */
exports.bench = (fn, name, iterations = 1000) => {
  const s = recordMemorySpike()
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
    s.collect()
  }
  const t1 = performance.now()
  return history(name, {
    [name]: (t1 - t0) / iterations,
    MEMORY_SPIKE: s.getResult(),
  })
}

/**
 * Benchmarks an asynchronous function.
 *
 * @param {Function} fn - The asynchronous function to be benchmarked.
 * @param {string} name - The name of the benchmark.
 * @param {number} [iterations=1000] - The number of iterations to run the
 *   benchmark. Default is `1000`
 * @returns {Object} - The benchmark result, including the average time per
 *   iteration and memory spike.
 */
exports.benchAsync = async (fn, name, iterations = 1000) => {
  const s = recordMemorySpike()
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    await fn()
    s.collect()
  }
  const t1 = performance.now()
  return history(name, {
    [name]: (t1 - t0) / iterations,
    MEMORY_SPIKE: s.getResult(),
  })
}
/**
 * Benchmarks multiple asynchronous function calls using Promise.all.
 *
 * @param {Function} fn - The asynchronous function to be benchmarked.
 * @param {string} name - The name of the benchmark.
 * @param {number} [iterations=1000] - The number of iterations to run the
 *   benchmark. Default is `1000`
 * @returns {Object} - The benchmark result, including the average time per
 *   iteration and memory spike.
 */
exports.benchAsyncAll = async (fn, name, iterations = 1000) => {
  const s = recordMemorySpike()

  const calls = new Array(iterations).fill(0)
  const t0 = performance.now()
  await Promise.all(calls.map(() => fn()))
  const t1 = performance.now()
  return history(name, {
    [name]: (t1 - t0) / iterations,
    MEMORY_SPIKE: s.getResult(),
  })
}

exports.recordMemorySpike = recordMemorySpike
