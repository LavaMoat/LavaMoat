const { tmpdir } = require('node:os')
const { join } = require('node:path')
const fs = require('node:fs')

exports.init = (name = 'cache') => {
  const cacheFilePath = join(tmpdir(), `git-safe-${name}.json`)

  let data
  try {
    data = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'))
  } catch (e) {
    data = {}
  }

  return {
    get: (key) => data[key],
    set: (key, value) => {
      data[key] = value
      fs.writeFileSync(cacheFilePath, JSON.stringify(data), 'utf8')
    },
    has: (key) => key in data,
  }
}
