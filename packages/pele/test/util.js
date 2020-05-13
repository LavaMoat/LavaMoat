const util = require('util')
const execFile = util.promisify(require('child_process').execFile)

module.exports = {
  runNode
}

async function runNode ({ entryPath, cwd = process.cwd() } = {}) {
  const output = await execFile('node', [entryPath], { cwd })
  return { output }
}
