const { promises: fs } = require('node:fs')

module.exports = { fileExists }

async function fileExists(path) {
  try {
    await fs.access(path)
    return true
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false
    }
    throw err
  }
}
