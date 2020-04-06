const util = require('util')
const execFile = util.promisify(require('child_process').execFile)

module.exports = {
  runLavamoat
}

async function runLavamoat ({ args = [], cwd = process.cwd() } = {}) {
  const lavamoatPath = `${__dirname}/../src/index.js`
  const output = await execFile(lavamoatPath, args, { cwd })
  return { output }
}
