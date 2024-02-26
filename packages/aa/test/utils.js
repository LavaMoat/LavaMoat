const path = require('node:path')
const { symlink } = require('node:fs/promises')
const { existsSync } = require('node:fs')

/**
 * @param {{space_name: string, space_used_size: number}[]} stats
 */
const translateHeapStats = (stats = []) => {
  const result = {}
  for (const { space_name, space_used_size } of stats) {
    result[space_name] = space_used_size
  }
  return result
}

/**
 * @param {Record<string, number>} current
 * @param {Record<string, number>} update
 */
const updateMaxEachKey = (current, update) => {
  for (const key in current) {
    current[key] = Math.max(current[key], update[key])
  }
}

/**
 * @param {Record<string, number>} a
 * @param {Record<string, number>} b
 */
const diffEachKey = (a, b) => {
  /** @type {Record<string, number>} */
  const result = {}
  for (const key in a) {
    result[key] = b[key] - a[key]
  }
  return result
}

/**
 * @param {Record<string, number>} obj
 */
const toHumanReadable = (obj) => {
  const result = {}
  for (const key in obj) {
    if (obj[key] > 0) result[key] = `+${(obj[key] / 1024 / 1024).toFixed(4)} MB`
  }
  return result
}

/**
 * @param {number} frequency
 */
const recordMemorySpike = (frequency = 10) => {
  const v8 = require('v8')
  const initial = translateHeapStats(v8.getHeapSpaceStatistics())
  const result = { ...initial }
  const collect = () =>
    updateMaxEachKey(result, translateHeapStats(v8.getHeapSpaceStatistics()))
  const interval = setInterval(collect, frequency).unref()
  return {
    collect,
    getResult: () => {
      clearInterval(interval)
      collect()
      return toHumanReadable(diffEachKey(initial, result))
    },
  }
}

/**
 * Normalizes paths in canonical name map entries
 *
 * @param {[string, string][]} arr
 * @returns {[string, string][]}
 */
exports.normalizePaths = (arr) => {
  return arr.map(([dirpath, name]) => [path.normalize(dirpath), name])
}

exports.osIndependentSymlink = async (target, src) => {
  if (!existsSync(src)) {
    await symlink(
      target,
      src,
      'junction' // Ignored on POSIX, Windows only, same as pkg managers use
    )
  }
}
exports.createProject4Symlink = async () => {
  const src = path.join(__dirname, 'projects', '4', 'node_modules', 'aaa')
  const target = path.join(__dirname, 'projects', '4', 'packages', 'aaa')
  await exports.osIndependentSymlink(target, src)
}

/**
 * @param {(() => void)} fn
 * @param {string} name
 * @param {iterations} number
 * @returns {{MEMORY_SPIKE: string, [x: string]: number}}
 */
exports.bench = (fn, name, iterations = 10000) => {
  const s = recordMemorySpike()
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    fn()
    s.collect()
  }
  const t1 = performance.now()
  return { [name]: (t1 - t0) / iterations, MEMORY_SPIKE: s.getResult() }
}

/**
 * @param {(() => void | Promise<void>)} fn
 * @param {string} name
 * @param {iterations} number
 * @returns {Promise<{MEMORY_SPIKE: string, [x: string]: number}>
 */
exports.benchAsync = async (fn, name, iterations = 1000) => {
  const s = recordMemorySpike()
  const t0 = performance.now()
  for (let i = 0; i < iterations; i++) {
    await fn()
    s.collect()
  }
  const t1 = performance.now()
  return { [name]: (t1 - t0) / iterations, MEMORY_SPIKE: s.getResult() }
}

/**
 * @param {(() => void | Promise<void>)} fn
 * @param {string} name
 * @param {iterations} number
 * @returns {Promise<{MEMORY_SPIKE: string, [x: string]: number}>
 */
exports.benchAsyncAll = async (fn, name, iterations = 1000) => {
  const s = recordMemorySpike()

  const calls = new Array(iterations).fill(0)
  const t0 = performance.now()
  await Promise.all(calls.map(() => fn()))
  const t1 = performance.now()
  return { [name]: (t1 - t0) / iterations, MEMORY_SPIKE: s.getResult() }
}

exports.recordMemorySpike = recordMemorySpike
